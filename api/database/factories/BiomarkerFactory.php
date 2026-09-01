<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Infrastructure\Persistence\Eloquent\Models\Biomarker;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Biomarker>
 */
final class BiomarkerFactory extends Factory
{
    protected $model = Biomarker::class;

    /**
     * @var list<array{code: string, label: string, unit: string, ref_min: float, ref_max: float}>
     */
    private const CATALOG = [
        ['code' => 'glucose', 'label' => 'Glicemia em jejum', 'unit' => 'mg/dL', 'ref_min' => 70.0, 'ref_max' => 99.0],
        ['code' => 'hba1c', 'label' => 'Hemoglobina glicada', 'unit' => '%', 'ref_min' => 4.0, 'ref_max' => 5.6],
        ['code' => 'ldl', 'label' => 'Colesterol LDL', 'unit' => 'mg/dL', 'ref_min' => 0.0, 'ref_max' => 129.0],
        ['code' => 'hdl', 'label' => 'Colesterol HDL', 'unit' => 'mg/dL', 'ref_min' => 40.0, 'ref_max' => 60.0],
        ['code' => 'triglycerides', 'label' => 'Triglicerídeos', 'unit' => 'mg/dL', 'ref_min' => 0.0, 'ref_max' => 149.0],
        ['code' => 'tsh', 'label' => 'Hormônio tireoestimulante', 'unit' => 'mUI/L', 'ref_min' => 0.4, 'ref_max' => 4.0],
        ['code' => 'vitamin_d', 'label' => 'Vitamina D', 'unit' => 'ng/mL', 'ref_min' => 30.0, 'ref_max' => 100.0],
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $reference = $this->faker->randomElement(self::CATALOG);

        return [
            'patient_id' => $this->faker->uuid(),
            'code' => $reference['code'],
            'label' => $reference['label'],
            'unit' => $reference['unit'],
            'ref_min' => $reference['ref_min'],
            'ref_max' => $reference['ref_max'],
            'value' => $this->faker->randomFloat(2, $reference['ref_min'], $reference['ref_max']),
            'measured_at' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }

    public function outOfRange(): self
    {
        return $this->state(function (array $attributes) {
            /** @var float $refMin */
            $refMin = $attributes['ref_min'];
            /** @var float $refMax */
            $refMax = $attributes['ref_max'];

            $canGoLow = $refMin > 1.0;
            $goLow = $canGoLow && $this->faker->boolean();

            $value = $goLow
                ? $refMin - $this->faker->randomFloat(2, 1, min($refMin, 5.0))
                : $refMax + $this->faker->randomFloat(2, 1, max($refMax, 5.0) / 2);

            return [
                'value' => max(0.01, $value),
            ];
        });
    }
}
