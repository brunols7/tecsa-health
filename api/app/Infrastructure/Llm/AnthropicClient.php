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

final class AnthropicClient implements LlmClient
{
    private const TIMEOUT_SECONDS = 15;

    private const API_URL = 'https://api.anthropic.com/v1/messages';

    private const ANTHROPIC_VERSION = '2023-06-01';

    public function generate(AiPromptInput $input): AiSuggestion
    {
        try {
            $response = Http::withHeaders([
                'x-api-key' => (string) config('services.anthropic.key'),
                'anthropic-version' => self::ANTHROPIC_VERSION,
                'content-type' => 'application/json',
            ])
                ->timeout(self::TIMEOUT_SECONDS)
                ->post(self::API_URL, [
                    'model' => config('services.anthropic.model'),
                    'max_tokens' => 1024,
                    'messages' => [
                        ['role' => 'user', 'content' => $this->buildPrompt($input)],
                    ],
                ]);
        } catch (ConnectionException) {
            throw new LlmTimeout(self::TIMEOUT_SECONDS);
        }

        if ($response->failed()) {
            throw new LlmInvalidResponse("http status {$response->status()}");
        }

        $text = $response->json('content.0.text');

        if (! is_string($text)) {
            throw new LlmInvalidResponse('response has no text content block');
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
        {$this->existingTitlesInstruction($input)}
        PROMPT;
    }

    private function existingTitlesInstruction(AiPromptInput $input): string
    {
        if ($input->existingTitles === []) {
            return '';
        }

        $titles = json_encode($input->existingTitles, JSON_THROW_ON_ERROR);

        return "Não repita nenhuma das ações a seguir, já sugeridas anteriormente para este paciente: {$titles}";
    }
}
