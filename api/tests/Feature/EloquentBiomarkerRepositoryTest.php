<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Biomarker\Biomarker;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Biomarker\BiomarkerStatus;
use App\Infrastructure\Persistence\Eloquent\Models\Biomarker as BiomarkerModel;
use App\Infrastructure\Persistence\Eloquent\Models\Brand as BrandModel;
use App\Infrastructure\Persistence\Eloquent\Models\Patient as PatientModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Ramsey\Uuid\Uuid;
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

    public function test_save_persists_a_new_biomarker_with_the_explicit_id(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $id = Uuid::uuid4()->toString();

        $biomarker = new Biomarker(
            id: $id,
            patientId: $patient->id,
            code: 'ferritina',
            label: 'Ferritina',
            value: 40.5,
            unit: 'ng/mL',
            refMin: 20.0,
            refMax: 200.0,
            measuredAt: '2026-01-15T00:00:00+00:00',
            status: BiomarkerStatus::Normal,
        );

        $repository = $this->app->make(BiomarkerRepository::class);
        $repository->save($biomarker);

        $stored = BiomarkerModel::query()->findOrFail($id);

        $this->assertSame($id, $stored->id);
        $this->assertSame($patient->id, $stored->patient_id);
        $this->assertSame('ferritina', $stored->code);
        $this->assertSame('Ferritina', $stored->label);
        $this->assertSame(40.5, $stored->value);
        $this->assertSame('ng/mL', $stored->unit);
        $this->assertSame(20.0, $stored->ref_min);
        $this->assertSame(200.0, $stored->ref_max);
    }

    public function test_save_makes_the_biomarker_readable_via_list_for_patient(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $id = Uuid::uuid4()->toString();

        $biomarker = new Biomarker(
            id: $id,
            patientId: $patient->id,
            code: 'tsh',
            label: 'TSH',
            value: 2.0,
            unit: 'mIU/L',
            refMin: 0.4,
            refMax: 4.0,
            measuredAt: '2026-01-15T00:00:00+00:00',
            status: BiomarkerStatus::Normal,
        );

        $repository = $this->app->make(BiomarkerRepository::class);
        $repository->save($biomarker);

        $result = $repository->listForPatient($patient->id);

        $this->assertCount(1, $result);
        $this->assertSame($id, $result[0]->id);
        $this->assertSame('tsh', $result[0]->code);
    }
}
