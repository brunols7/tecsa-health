<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Patient\PatientGoal;
use PHPUnit\Framework\TestCase;

class PatientGoalTest extends TestCase
{
    public function test_values_returns_the_four_values_in_declaration_order(): void
    {
        $this->assertSame(
            ['lose_weight', 'gain_muscle', 'maintain', 'manage_condition'],
            PatientGoal::values(),
        );
    }

    public function test_from_resolves_each_declared_value(): void
    {
        $this->assertSame(PatientGoal::LoseWeight, PatientGoal::from('lose_weight'));
        $this->assertSame(PatientGoal::GainMuscle, PatientGoal::from('gain_muscle'));
        $this->assertSame(PatientGoal::Maintain, PatientGoal::from('maintain'));
        $this->assertSame(PatientGoal::ManageCondition, PatientGoal::from('manage_condition'));
    }
}
