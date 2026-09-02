<?php

declare(strict_types=1);

namespace App\Domain\AiAction\Exceptions;

use RuntimeException;

final class LlmTimeout extends RuntimeException
{
    public function __construct(int $seconds)
    {
        parent::__construct("Llm request timed out after {$seconds}s");
    }
}
