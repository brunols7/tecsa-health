<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\AiAction\AiAction;
use App\Domain\AiAction\AiActionRepository;
use App\Domain\AiAction\AiActionStatus;
use App\Domain\AiAction\Exceptions\AiActionNotFound;
use App\Infrastructure\Persistence\Eloquent\Models\AiAction as AiActionModel;
use App\Infrastructure\Persistence\Eloquent\Models\Brand as BrandModel;
use App\Infrastructure\Persistence\Eloquent\Models\Patient as PatientModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Ramsey\Uuid\Uuid;
use Tests\TestCase;

class EloquentAiActionRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_find_by_id_returns_ai_action_when_it_exists(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id, title: 'Reduzir açúcar'));

        $repository = $this->app->make(AiActionRepository::class);

        $found = $repository->findById($action->id);

        $this->assertNotNull($found);
        $this->assertSame($action->id, $found->id);
        $this->assertSame('Reduzir açúcar', $found->title);
    }

    public function test_find_by_id_returns_null_when_ai_action_does_not_exist(): void
    {
        $repository = $this->app->make(AiActionRepository::class);

        $found = $repository->findById(Uuid::uuid4()->toString());

        $this->assertNull($found);
    }

    public function test_list_for_patient_orders_by_created_at_desc(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $older = AiActionModel::query()->create($this->rowFor($patient->id, title: 'Mais antiga', createdAt: '2026-01-01T00:00:00+00:00'));
        $newer = AiActionModel::query()->create($this->rowFor($patient->id, title: 'Mais recente', createdAt: '2026-02-01T00:00:00+00:00'));

        $repository = $this->app->make(AiActionRepository::class);

        $items = $repository->listForPatient($patient->id);

        $this->assertCount(2, $items);
        $this->assertSame($newer->id, $items[0]->id);
        $this->assertSame($older->id, $items[1]->id);
    }

    public function test_find_by_patient_and_hash_returns_empty_array_on_cache_miss(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $repository = $this->app->make(AiActionRepository::class);

        $result = $repository->findByPatientAndHash($patient->id, 'unknown-hash');

        $this->assertSame([], $result);
    }

    public function test_find_by_patient_and_hash_returns_matching_rows_on_cache_hit(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $matching = AiActionModel::query()->create($this->rowFor($patient->id, inputHash: 'hash-a'));
        AiActionModel::query()->create($this->rowFor($patient->id, inputHash: 'hash-b'));

        $repository = $this->app->make(AiActionRepository::class);

        $result = $repository->findByPatientAndHash($patient->id, 'hash-a');

        $this->assertCount(1, $result);
        $this->assertSame($matching->id, $result[0]->id);
    }

    public function test_find_by_patient_and_hash_excludes_deleted_rows_but_keeps_the_rest(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $surviving = AiActionModel::query()->create($this->rowFor($patient->id, status: 'accepted', inputHash: 'hash-a'));
        AiActionModel::query()->create($this->rowFor($patient->id, status: 'deleted', inputHash: 'hash-a'));

        $repository = $this->app->make(AiActionRepository::class);

        $result = $repository->findByPatientAndHash($patient->id, 'hash-a');

        $this->assertCount(1, $result);
        $this->assertSame($surviving->id, $result[0]->id);
    }

    public function test_list_for_patient_excludes_deleted_rows_but_keeps_the_rest(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $surviving = AiActionModel::query()->create($this->rowFor($patient->id, status: 'dismissed'));
        AiActionModel::query()->create($this->rowFor($patient->id, status: 'deleted'));

        $repository = $this->app->make(AiActionRepository::class);

        $result = $repository->listForPatient($patient->id);

        $this->assertCount(1, $result);
        $this->assertSame($surviving->id, $result[0]->id);
    }

    public function test_find_by_patient_and_hash_never_returns_another_patients_rows(): void
    {
        $brand = BrandModel::factory()->create();
        $patientA = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $patientB = PatientModel::factory()->create(['brand_id' => $brand->id]);

        AiActionModel::query()->create($this->rowFor($patientB->id, inputHash: 'shared-hash'));

        $repository = $this->app->make(AiActionRepository::class);

        $result = $repository->findByPatientAndHash($patientA->id, 'shared-hash');

        $this->assertSame([], $result);
    }

    public function test_insert_many_persists_all_rows_in_a_single_call(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $actions = [
            new AiAction(
                id: Uuid::uuid4()->toString(),
                patientId: $patient->id,
                title: 'Ação 1',
                rationale: 'Rationale 1',
                priority: 'high',
                biomarkers: ['glucose'],
                status: AiActionStatus::Pending,
                inputHash: 'hash-x',
                createdAt: '2026-01-01T00:00:00+00:00',
            ),
            new AiAction(
                id: Uuid::uuid4()->toString(),
                patientId: $patient->id,
                title: 'Ação 2',
                rationale: 'Rationale 2',
                priority: 'medium',
                biomarkers: ['hba1c'],
                status: AiActionStatus::Pending,
                inputHash: 'hash-x',
                createdAt: '2026-01-01T00:00:00+00:00',
            ),
        ];

        $repository = $this->app->make(AiActionRepository::class);

        $repository->insertMany($actions);

        $this->assertSame(2, AiActionModel::query()->where('patient_id', $patient->id)->count());
    }

    public function test_update_status_changes_and_returns_the_updated_entity(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id, status: 'pending'));

        $repository = $this->app->make(AiActionRepository::class);

        $updated = $repository->updateStatus($action->id, AiActionStatus::Accepted);

        $this->assertSame(AiActionStatus::Accepted, $updated->status);
        $this->assertSame('accepted', $action->fresh()->status);
    }

    public function test_update_status_throws_ai_action_not_found_for_unknown_id(): void
    {
        $repository = $this->app->make(AiActionRepository::class);

        $this->expectException(AiActionNotFound::class);

        $repository->updateStatus(Uuid::uuid4()->toString(), AiActionStatus::Accepted);
    }

    /**
     * @return array<string, mixed>
     */
    private function rowFor(
        string $patientId,
        string $title = 'Reduzir açúcar',
        string $status = 'pending',
        string $inputHash = 'hash-default',
        string $createdAt = '2026-01-01T00:00:00+00:00',
    ): array {
        return [
            'id' => Uuid::uuid4()->toString(),
            'patient_id' => $patientId,
            'title' => $title,
            'rationale' => 'Porque sim',
            'priority' => 'medium',
            'biomarkers' => ['glucose'],
            'status' => $status,
            'input_hash' => $inputHash,
            'created_at' => $createdAt,
        ];
    }
}
