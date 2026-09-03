<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Biomarker\BiomarkerCode;
use PHPUnit\Framework\TestCase;

class BiomarkerCodeTest extends TestCase
{
    public function test_generates_slug_from_simple_label(): void
    {
        $this->assertSame('ferritina', BiomarkerCode::fromLabel('Ferritina'));
    }

    public function test_strips_accents(): void
    {
        $this->assertSame('ferro_serico', BiomarkerCode::fromLabel('Ferro sérico'));
    }

    public function test_preserves_already_normalized_label(): void
    {
        $this->assertSame('hemoglobina_glicada', BiomarkerCode::fromLabel('hemoglobina_glicada'));
    }

    public function test_replaces_punctuation_with_underscore(): void
    {
        $this->assertSame('vitamina_d_25_oh', BiomarkerCode::fromLabel('Vitamina D (25-OH)'));
    }

    public function test_collapses_multiple_spaces_into_single_underscore(): void
    {
        $this->assertSame('colesterol_total', BiomarkerCode::fromLabel('Colesterol   Total'));
    }

    public function test_trims_leading_and_trailing_underscores(): void
    {
        $this->assertSame('tsh', BiomarkerCode::fromLabel('  TSH!!  '));
    }
}
