<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Infrastructure\Persistence\Eloquent\Models\Biomarker;
use App\Infrastructure\Persistence\Eloquent\Models\Brand;
use App\Infrastructure\Persistence\Eloquent\Models\Patient;
use Illuminate\Database\Seeder;
use RuntimeException;

final class PatientSeeder extends Seeder
{
    private const DEFAULT_COUNT = 5000;

    /**
     * Semente fixa do Faker: garante que os mesmos 5.000+ pacientes (e a mesma distribuição
     * entre marcas e biomarcadores fora de faixa) nasçam idênticos a cada execução a partir de
     * um banco limpo.
     */
    private const FAKER_SEED = 42;

    private const OUT_OF_RANGE_CHANCE = 15;

    public function run(int $count = self::DEFAULT_COUNT): void
    {
        fake()->seed(self::FAKER_SEED);

        $brandIds = Brand::query()->orderBy('slug')->pluck('id')->all();

        if ($brandIds === []) {
            throw new RuntimeException('PatientSeeder requires brands to be seeded first.');
        }

        for ($i = 0; $i < $count; $i++) {
            $brandId = $brandIds[$i % count($brandIds)];

            $patient = Patient::factory()->create(['brand_id' => $brandId]);

            $biomarkerCount = fake()->numberBetween(1, 3);

            for ($j = 0; $j < $biomarkerCount; $j++) {
                $factory = Biomarker::factory();

                if (fake()->boolean(self::OUT_OF_RANGE_CHANCE)) {
                    $factory = $factory->outOfRange();
                }

                $factory->create(['patient_id' => $patient->id]);
            }
        }
    }
}
