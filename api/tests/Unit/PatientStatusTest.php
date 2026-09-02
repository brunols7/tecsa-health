<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Patient\PatientStatus;
use PHPUnit\Framework\TestCase;

class PatientStatusTest extends TestCase
{
    public function test_active_can_transition_to_inactive(): void
    {
        $this->assertTrue(PatientStatus::Active->canTransitionTo(PatientStatus::Inactive));
    }

    public function test_active_can_transition_to_completed(): void
    {
        $this->assertTrue(PatientStatus::Active->canTransitionTo(PatientStatus::Completed));
    }

    public function test_inactive_can_transition_to_active(): void
    {
        $this->assertTrue(PatientStatus::Inactive->canTransitionTo(PatientStatus::Active));
    }

    public function test_completed_can_transition_to_active(): void
    {
        $this->assertTrue(PatientStatus::Completed->canTransitionTo(PatientStatus::Active));
    }

    public function test_inactive_cannot_transition_to_completed(): void
    {
        $this->assertFalse(PatientStatus::Inactive->canTransitionTo(PatientStatus::Completed));
    }

    public function test_completed_cannot_transition_to_inactive(): void
    {
        $this->assertFalse(PatientStatus::Completed->canTransitionTo(PatientStatus::Inactive));
    }

    public function test_active_cannot_transition_to_active(): void
    {
        $this->assertFalse(PatientStatus::Active->canTransitionTo(PatientStatus::Active));
    }

    public function test_inactive_cannot_transition_to_inactive(): void
    {
        $this->assertFalse(PatientStatus::Inactive->canTransitionTo(PatientStatus::Inactive));
    }

    public function test_completed_cannot_transition_to_completed(): void
    {
        $this->assertFalse(PatientStatus::Completed->canTransitionTo(PatientStatus::Completed));
    }

    public function test_values_returns_the_three_values_in_declaration_order(): void
    {
        $this->assertSame(['active', 'inactive', 'completed'], PatientStatus::values());
    }
}
