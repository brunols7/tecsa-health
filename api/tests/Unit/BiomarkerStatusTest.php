<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Biomarker\BiomarkerStatus;
use PHPUnit\Framework\TestCase;

class BiomarkerStatusTest extends TestCase
{
    public function test_returns_low_when_value_is_below_ref_min(): void
    {
        $this->assertSame(BiomarkerStatus::Low, BiomarkerStatus::from(69.0, 70.0, 99.0));
    }

    public function test_returns_normal_when_value_equals_ref_min(): void
    {
        $this->assertSame(BiomarkerStatus::Normal, BiomarkerStatus::from(70.0, 70.0, 99.0));
    }

    public function test_returns_normal_when_value_is_inside_the_range(): void
    {
        $this->assertSame(BiomarkerStatus::Normal, BiomarkerStatus::from(85.0, 70.0, 99.0));
    }

    public function test_returns_normal_when_value_equals_ref_max(): void
    {
        $this->assertSame(BiomarkerStatus::Normal, BiomarkerStatus::from(99.0, 70.0, 99.0));
    }

    public function test_returns_high_when_value_is_above_ref_max(): void
    {
        $this->assertSame(BiomarkerStatus::High, BiomarkerStatus::from(100.0, 70.0, 99.0));
    }
}
