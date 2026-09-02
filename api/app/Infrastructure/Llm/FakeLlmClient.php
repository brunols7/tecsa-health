<?php

declare(strict_types=1);

namespace App\Infrastructure\Llm;

use App\Domain\AiAction\AiPromptInput;
use App\Domain\AiAction\AiSuggestion;
use App\Domain\AiAction\LlmClient;
use RuntimeException;
use Throwable;

final class FakeLlmClient implements LlmClient
{
    /**
     * @var array<int, AiSuggestion|Throwable>
     */
    private array $queue = [];

    private int $timesCalled = 0;

    /**
     * @var array<int, AiPromptInput>
     */
    private array $receivedInputs = [];

    public function respondWith(AiSuggestion $suggestion): void
    {
        $this->queue[] = $suggestion;
    }

    public function failWith(Throwable $exception): void
    {
        $this->queue[] = $exception;
    }

    public function timesCalled(): int
    {
        return $this->timesCalled;
    }

    public function lastInput(): ?AiPromptInput
    {
        return $this->receivedInputs === [] ? null : $this->receivedInputs[count($this->receivedInputs) - 1];
    }

    public function generate(AiPromptInput $input): AiSuggestion
    {
        $this->timesCalled++;
        $this->receivedInputs[] = $input;

        $next = array_shift($this->queue);

        if ($next === null) {
            throw new RuntimeException('FakeLlmClient has no configured response.');
        }

        if ($next instanceof Throwable) {
            throw $next;
        }

        return $next;
    }
}
