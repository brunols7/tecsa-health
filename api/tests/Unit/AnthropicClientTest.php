<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\AiAction\AiPromptInput;
use App\Domain\AiAction\Exceptions\LlmInvalidResponse;
use App\Domain\AiAction\Exceptions\LlmTimeout;
use App\Infrastructure\Llm\AnthropicClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AnthropicClientTest extends TestCase
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
            'api.anthropic.com/*' => Http::response([
                'content' => [
                    [
                        'type' => 'text',
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
            ], 200),
        ]);

        $client = new AnthropicClient;

        $suggestion = $client->generate($this->promptInput());

        $this->assertSame('moderate', $suggestion->riskLevel);
        $this->assertSame('Glicemia levemente elevada.', $suggestion->summary);
        $this->assertCount(1, $suggestion->actions);
        $this->assertSame('Reduzir açúcar refinado', $suggestion->actions[0]->title);
    }

    public function test_generate_throws_llm_invalid_response_when_json_is_outside_schema(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [
                    [
                        'type' => 'text',
                        'text' => json_encode([
                            'risk_level' => 'not-a-valid-level',
                            'summary' => 'x',
                        ]),
                    ],
                ],
            ], 200),
        ]);

        $client = new AnthropicClient;

        $this->expectException(LlmInvalidResponse::class);

        $client->generate($this->promptInput());
    }

    public function test_generate_throws_llm_invalid_response_when_text_is_not_valid_json(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [
                    ['type' => 'text', 'text' => 'not json at all'],
                ],
            ], 200),
        ]);

        $client = new AnthropicClient;

        $this->expectException(LlmInvalidResponse::class);

        $client->generate($this->promptInput());
    }

    public function test_generate_throws_llm_timeout_when_connection_fails(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Connection timed out');
        });

        $client = new AnthropicClient;

        $this->expectException(LlmTimeout::class);

        $client->generate($this->promptInput());
    }

    public function test_generate_never_sends_patient_name_or_id_in_the_prompt(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [
                    [
                        'type' => 'text',
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
            ], 200),
        ]);

        $client = new AnthropicClient;
        $client->generate($this->promptInput());

        Http::assertSent(function ($request) {
            $body = $request->body();

            return ! str_contains($body, '"name"')
                && ! str_contains($body, '"id"')
                && str_contains($body, 'lose_weight');
        });
    }
}
