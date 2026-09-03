<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\Patient\PatientGoal;
use App\Domain\Patient\PatientStatus;
use App\Infrastructure\Persistence\Eloquent\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
final class PatientFactory extends Factory
{
    protected $model = Patient::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'brand_id' => $this->faker->uuid(),
            'name' => $this->faker->name(),
            'birth_date' => $this->faker->dateTimeBetween('-90 years', '-18 years')->format('Y-m-d'),
            'goal' => $this->faker->randomElement(PatientGoal::values()),
            'status' => PatientStatus::Active->value,
            'needs_follow_up' => false,
            'updated_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
        ];
    }
}
