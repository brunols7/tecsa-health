<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\AiAction\InputHashCalculator;
use PHPUnit\Framework\TestCase;

class InputHashCalculatorTest extends TestCase
{
    public function test_same_biomarkers_in_different_order_and_same_goal_produce_same_hash(): void
    {
        $goal = 'weight-loss';

        $biomarkersInOrder = [
            ['code' => 'glucose', 'value' => 90.0, 'unit' => 'mg/dL', 'measuredAt' => '2026-01-01'],
            ['code' => 'hba1c', 'value' => 5.4, 'unit' => '%', 'measuredAt' => '2026-01-01'],
        ];

        $biomarkersReversed = [
            ['code' => 'hba1c', 'value' => 5.4, 'unit' => '%', 'measuredAt' => '2026-01-01'],
            ['code' => 'glucose', 'value' => 90.0, 'unit' => 'mg/dL', 'measuredAt' => '2026-01-01'],
        ];

        $this->assertSame(
            InputHashCalculator::compute($biomarkersInOrder, $goal),
            InputHashCalculator::compute($biomarkersReversed, $goal),
        );
    }

    public function test_different_goal_produces_different_hash(): void
    {
        $biomarkers = [
            ['code' => 'glucose', 'value' => 90.0, 'unit' => 'mg/dL', 'measuredAt' => '2026-01-01'],
        ];

        $this->assertNotSame(
            InputHashCalculator::compute($biomarkers, 'weight-loss'),
            InputHashCalculator::compute($biomarkers, 'muscle-gain'),
        );
    }

    public function test_different_biomarker_value_produces_different_hash(): void
    {
        $goal = 'weight-loss';

        $biomarkersA = [
            ['code' => 'glucose', 'value' => 90.0, 'unit' => 'mg/dL', 'measuredAt' => '2026-01-01'],
        ];

        $biomarkersB = [
            ['code' => 'glucose', 'value' => 95.0, 'unit' => 'mg/dL', 'measuredAt' => '2026-01-01'],
        ];

        $this->assertNotSame(
            InputHashCalculator::compute($biomarkersA, $goal),
            InputHashCalculator::compute($biomarkersB, $goal),
        );
    }
}
