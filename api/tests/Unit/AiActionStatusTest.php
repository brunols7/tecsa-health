<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\AiAction\AiActionStatus;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class AiActionStatusTest extends TestCase
{
    public function test_from_string_returns_pending(): void
    {
        $this->assertSame(AiActionStatus::Pending, AiActionStatus::fromString('pending'));
    }

    public function test_from_string_returns_accepted(): void
    {
        $this->assertSame(AiActionStatus::Accepted, AiActionStatus::fromString('accepted'));
    }

    public function test_from_string_returns_dismissed(): void
    {
        $this->assertSame(AiActionStatus::Dismissed, AiActionStatus::fromString('dismissed'));
    }

    public function test_from_string_throws_for_invalid_value(): void
    {
        $this->expectException(InvalidArgumentException::class);

        AiActionStatus::fromString('resolved');
    }

    public function test_pending_can_transition_to_accepted(): void
    {
        $this->assertTrue(AiActionStatus::Pending->canTransitionTo(AiActionStatus::Accepted));
    }

    public function test_pending_can_transition_to_dismissed(): void
    {
        $this->assertTrue(AiActionStatus::Pending->canTransitionTo(AiActionStatus::Dismissed));
    }

    public function test_accepted_cannot_transition_to_pending(): void
    {
        $this->assertFalse(AiActionStatus::Accepted->canTransitionTo(AiActionStatus::Pending));
    }

    public function test_accepted_cannot_transition_to_dismissed(): void
    {
        $this->assertFalse(AiActionStatus::Accepted->canTransitionTo(AiActionStatus::Dismissed));
    }

    public function test_dismissed_cannot_transition_to_pending(): void
    {
        $this->assertFalse(AiActionStatus::Dismissed->canTransitionTo(AiActionStatus::Pending));
    }

    public function test_dismissed_cannot_transition_to_accepted(): void
    {
        $this->assertFalse(AiActionStatus::Dismissed->canTransitionTo(AiActionStatus::Accepted));
    }

    public function test_from_string_returns_deleted(): void
    {
        $this->assertSame(AiActionStatus::Deleted, AiActionStatus::fromString('deleted'));
    }

    public function test_accepted_can_transition_to_deleted(): void
    {
        $this->assertTrue(AiActionStatus::Accepted->canTransitionTo(AiActionStatus::Deleted));
    }

    public function test_dismissed_can_transition_to_deleted(): void
    {
        $this->assertTrue(AiActionStatus::Dismissed->canTransitionTo(AiActionStatus::Deleted));
    }

    public function test_pending_cannot_transition_to_deleted(): void
    {
        $this->assertFalse(AiActionStatus::Pending->canTransitionTo(AiActionStatus::Deleted));
    }

    public function test_deleted_cannot_transition_to_deleted_again(): void
    {
        $this->assertFalse(AiActionStatus::Deleted->canTransitionTo(AiActionStatus::Deleted));
    }

    public function test_deleted_cannot_transition_to_pending(): void
    {
        $this->assertFalse(AiActionStatus::Deleted->canTransitionTo(AiActionStatus::Pending));
    }
}
