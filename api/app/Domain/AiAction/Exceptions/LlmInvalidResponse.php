<?php

declare(strict_types=1);

namespace App\Domain\AiAction\Exceptions;

use RuntimeException;

final class LlmInvalidResponse extends RuntimeException
{
    public function __construct(string $reason)
    {
        parent::__construct("Llm response failed schema validation: {$reason}");
    }
}
