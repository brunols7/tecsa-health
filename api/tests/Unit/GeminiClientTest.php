<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\AiAction\AiPromptInput;
use App\Domain\AiAction\Exceptions\LlmInvalidResponse;
use App\Domain\AiAction\Exceptions\LlmTimeout;
use App\Infrastructure\Llm\GeminiClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeminiClientTest extends TestCase
{
    private function promptInput(): AiPromptInput
    {
        return new AiPromptInput(
            age: 40,
            goal: 'lose_weight',
            biomarkers: [
                ['code' => 'glucose', 'value' => 110.0, 'unit' => 'mg/dL', 'refMin' => 70.0, 'refMax' => 99.0],
            ],
        );
    }

    public function test_generate_returns_ai_suggestion_when_response_is_valid(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'risk_level' => 'moderate',
                                        'summary' => 'Glicemia levemente elevada.',
                                        'actions' => [
                                            [
                                                'title' => 'Reduzir açúcar refinado',
                                                'rationale' => 'Glicemia acima da faixa de referência.',
                                                'biomarkers' => ['glucose'],
                                                'priority' => 'medium',
                                            ],
                                        ],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $client = new GeminiClient;

        $suggestion = $client->generate($this->promptInput());

        $this->assertSame('moderate', $suggestion->riskLevel);
        $this->assertSame('Glicemia levemente elevada.', $suggestion->summary);
        $this->assertCount(1, $suggestion->actions);
        $this->assertSame('Reduzir açúcar refinado', $suggestion->actions[0]->title);
    }

    public function test_generate_throws_llm_invalid_response_when_http_status_is_not_successful(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['error' => 'forbidden'], 403),
        ]);

        $client = new GeminiClient;

        $this->expectException(LlmInvalidResponse::class);
        $this->expectExceptionMessage('http status 403');

        $client->generate($this->promptInput());
    }

    public function test_generate_throws_llm_invalid_response_when_json_is_outside_schema(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'risk_level' => 'not-a-valid-level',
                                        'summary' => 'x',
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $client = new GeminiClient;

        $this->expectException(LlmInvalidResponse::class);

        $client->generate($this->promptInput());
    }

    public function test_generate_throws_llm_invalid_response_when_text_is_not_valid_json(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'not json at all']]]],
                ],
            ], 200),
        ]);

        $client = new GeminiClient;

        $this->expectException(LlmInvalidResponse::class);

        $client->generate($this->promptInput());
    }

    public function test_generate_throws_llm_timeout_when_connection_fails(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Connection timed out');
        });

        $client = new GeminiClient;

        $this->expectException(LlmTimeout::class);

        $client->generate($this->promptInput());
    }

    public function test_generate_never_sends_patient_name_or_id_in_the_prompt(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'risk_level' => 'low',
                                        'summary' => 'Tudo dentro da faixa.',
                                        'actions' => [
                                            [
                                                'title' => 'Manter rotina',
                                                'rationale' => 'Biomarcadores dentro da faixa.',
                                                'biomarkers' => ['glucose'],
                                                'priority' => 'low',
                                            ],
                                        ],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $client = new GeminiClient;
        $client->generate($this->promptInput());

        Http::assertSent(function ($request) {
            $body = $request->body();

            return ! str_contains($body, '"name"')
                && ! str_contains($body, '"id"')
                && str_contains($body, 'lose_weight');
        });
    }

    public function test_generate_sends_api_key_in_query_string_not_body(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'risk_level' => 'low',
                                        'summary' => 'Tudo dentro da faixa.',
                                        'actions' => [
                                            [
                                                'title' => 'Manter rotina',
                                                'rationale' => 'Biomarcadores dentro da faixa.',
                                                'biomarkers' => ['glucose'],
                                                'priority' => 'low',
                                            ],
                                        ],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        config(['services.gemini.key' => 'test-gemini-key', 'services.gemini.model' => 'gemini-2.5-flash']);

        $client = new GeminiClient;
        $client->generate($this->promptInput());

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'key=test-gemini-key')
                && str_contains($request->url(), 'gemini-2.5-flash:generateContent')
                && ! str_contains($request->body(), 'test-gemini-key');
        });
    }
}
