<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

final class InputHashCalculator
{
    public static function compute(array $biomarkers, string $goal): string
    {
        $sorted = $biomarkers;
        usort($sorted, static fn (array $a, array $b): int => $a['code'] <=> $b['code']);

        return hash('sha256', json_encode([
            'biomarkers' => $sorted,
            'goal' => $goal,
        ], JSON_THROW_ON_ERROR));
    }
}
