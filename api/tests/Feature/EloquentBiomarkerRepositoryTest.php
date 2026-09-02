<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Biomarker\BiomarkerStatus;
use App\Infrastructure\Persistence\Eloquent\Models\Biomarker as BiomarkerModel;
use App\Infrastructure\Persistence\Eloquent\Models\Brand as BrandModel;
use App\Infrastructure\Persistence\Eloquent\Models\Patient as PatientModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EloquentBiomarkerRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_empty_array_when_patient_has_no_biomarkers(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $repository = $this->app->make(BiomarkerRepository::class);

        $this->assertSame([], $repository->listForPatient($patient->id));
    }

    public function test_returns_biomarkers_ordered_by_measured_at_descending(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $older = BiomarkerModel::factory()->create([
            'patient_id' => $patient->id,
            'measured_at' => now()->subDays(10),
        ]);
        $newer = BiomarkerModel::factory()->create([
            'patient_id' => $patient->id,
            'measured_at' => now()->subDay(),
        ]);

        $repository = $this->app->make(BiomarkerRepository::class);

        $result = $repository->listForPatient($patient->id);

        $this->assertCount(2, $result);
        $this->assertSame($newer->id, $result[0]->id);
        $this->assertSame($older->id, $result[1]->id);
    }

    public function test_each_biomarker_carries_the_correct_derived_status(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $normal = BiomarkerModel::factory()->create(['patient_id' => $patient->id]);
        $outOfRange = BiomarkerModel::factory()->outOfRange()->create(['patient_id' => $patient->id]);

        $repository = $this->app->make(BiomarkerRepository::class);

        $result = $repository->listForPatient($patient->id);

        $byId = collect($result)->keyBy('id');

        $this->assertSame(BiomarkerStatus::Normal, $byId[$normal->id]->status);
        $this->assertNotSame(BiomarkerStatus::Normal, $byId[$outOfRange->id]->status);
    }
}
