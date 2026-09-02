<?php

declare(strict_types=1);

namespace App\Application\AiAction;

use App\Domain\AiAction\AiAction;

final class AiActionGenerationResult
{
    /**
     * @param  array<int, AiAction>  $actions
     */
    public function __construct(
        public readonly array $actions,
        public readonly bool $generated,
    ) {}
}
