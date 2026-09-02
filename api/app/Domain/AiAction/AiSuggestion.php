<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

final class AiSuggestion
{
    /**
     * @param  array<int, AiSuggestedAction>  $actions
     */
    public function __construct(
        public readonly string $riskLevel,
        public readonly string $summary,
        public readonly array $actions,
    ) {}

    /**
     * @param  array{risk_level: string, summary: string, actions: array<int, array{title: string, rationale: string, biomarkers: array<int, string>, priority: string}>}  $validated
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            riskLevel: $validated['risk_level'],
            summary: $validated['summary'],
            actions: array_map(
                static fn (array $action): AiSuggestedAction => new AiSuggestedAction(
                    title: $action['title'],
                    rationale: $action['rationale'],
                    biomarkers: $action['biomarkers'],
                    priority: $action['priority'],
                ),
                $validated['actions'],
            ),
        );
    }
}
