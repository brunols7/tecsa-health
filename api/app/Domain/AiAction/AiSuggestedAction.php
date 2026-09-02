<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

final class AiSuggestedAction
{
    /**
     * @param  array<int, string>  $biomarkers
     */
    public function __construct(
        public readonly string $title,
        public readonly string $rationale,
        public readonly array $biomarkers,
        public readonly string $priority,
    ) {}
}
