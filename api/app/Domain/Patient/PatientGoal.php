<?php

declare(strict_types=1);

namespace App\Domain\Patient;

enum PatientGoal: string
{
    case LoseWeight = 'lose_weight';
    case GainMuscle = 'gain_muscle';
    case Maintain = 'maintain';
    case ManageCondition = 'manage_condition';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case): string => $case->value, self::cases());
    }
}
