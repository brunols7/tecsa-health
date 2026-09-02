<?php

declare(strict_types=1);

namespace App\Infrastructure\Llm;

use App\Domain\AiAction\AiPromptInput;
use App\Domain\AiAction\AiSuggestion;
use App\Domain\AiAction\Exceptions\LlmInvalidResponse;
use App\Domain\AiAction\Exceptions\LlmTimeout;
use App\Domain\AiAction\LlmClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use JsonException;

final class GeminiClient implements LlmClient
{
    private const TIMEOUT_SECONDS = 15;

    private const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    public function generate(AiPromptInput $input): AiSuggestion
    {
        $model = (string) config('services.gemini.model');
        $url = self::API_BASE_URL."/{$model}:generateContent?".http_build_query([
            'key' => (string) config('services.gemini.key'),
        ]);

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->post($url, [
                    'contents' => [
                        ['parts' => [['text' => $this->buildPrompt($input)]]],
                    ],
                    'generationConfig' => [
                        'response_mime_type' => 'application/json',
                        'thinkingConfig' => ['thinkingBudget' => 0],
                        'responseSchema' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'risk_level' => ['type' => 'STRING', 'enum' => ['low', 'moderate', 'high']],
                                'summary' => ['type' => 'STRING'],
                                'actions' => [
                                    'type' => 'ARRAY',
                                    'minItems' => 1,
                                    'maxItems' => 5,
                                    'items' => [
                                        'type' => 'OBJECT',
                                        'properties' => [
                                            'title' => ['type' => 'STRING'],
                                            'rationale' => ['type' => 'STRING'],
                                            'biomarkers' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                                            'priority' => ['type' => 'STRING', 'enum' => ['low', 'medium', 'high']],
                                        ],
                                        'required' => ['title', 'rationale', 'biomarkers', 'priority'],
                                    ],
                                ],
                            ],
                            'required' => ['risk_level', 'summary', 'actions'],
                        ],
                    ],
                ]);
        } catch (ConnectionException) {
            throw new LlmTimeout(self::TIMEOUT_SECONDS);
        }

        if ($response->failed()) {
            throw new LlmInvalidResponse("http status {$response->status()}");
        }

        $text = $response->json('candidates.0.content.parts.0.text');

        if (! is_string($text)) {
            throw new LlmInvalidResponse('response has no text content part');
        }

        try {
            $decoded = json_decode($text, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new LlmInvalidResponse("malformed json: {$exception->getMessage()}");
        }

        if (! is_array($decoded)) {
            throw new LlmInvalidResponse('decoded payload is not an array');
        }

        $validator = Validator::make($decoded, [
            'risk_level' => ['required', Rule::in(['low', 'moderate', 'high'])],
            'summary' => ['required', 'string', 'max:400'],
            'actions' => ['required', 'array', 'min:1', 'max:5'],
            'actions.*.title' => ['required', 'string', 'max:120'],
            'actions.*.rationale' => ['required', 'string', 'max:400'],
            'actions.*.biomarkers' => ['required', 'array'],
            'actions.*.priority' => ['required', Rule::in(['low', 'medium', 'high'])],
        ]);

        if ($validator->fails()) {
            throw new LlmInvalidResponse((string) $validator->errors()->first());
        }

        /** @var array{risk_level: string, summary: string, actions: array<int, array{title: string, rationale: string, biomarkers: array<int, string>, priority: string}>} $validated */
        $validated = $validator->validated();

        return AiSuggestion::fromArray($validated);
    }

    private function buildPrompt(AiPromptInput $input): string
    {
        $payload = json_encode([
            'age' => $input->age,
            'goal' => $input->goal,
            'biomarkers' => $input->biomarkers,
        ], JSON_THROW_ON_ERROR);

        return <<<PROMPT
        Você é um assistente clínico que sugere ações de acompanhamento nutricional.
        Responda APENAS com um JSON válido, sem texto adicional, no formato:
        {"risk_level": "low"|"moderate"|"high", "summary": "string até 400 caracteres", "actions": [{"title": "string até 120 caracteres", "rationale": "string até 400 caracteres", "biomarkers": ["codigo"], "priority": "low"|"medium"|"high"}]}
        Gere entre 1 e 5 ações com base nos dados clínicos a seguir:
        {$payload}
        PROMPT;
    }
}
