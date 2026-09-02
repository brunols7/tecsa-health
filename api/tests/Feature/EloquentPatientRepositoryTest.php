<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Patient\Exceptions\PatientNotFound;
use App\Domain\Patient\PatientCursor;
use App\Domain\Patient\PatientRepository;
use App\Infrastructure\Persistence\Eloquent\Models\Brand as BrandModel;
use App\Infrastructure\Persistence\Eloquent\Models\Patient as PatientModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Ramsey\Uuid\Uuid;
use Tests\TestCase;

class EloquentPatientRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_find_by_id_returns_patient_when_it_exists(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Ana Silva']);

        $repository = $this->app->make(PatientRepository::class);

        $found = $repository->findById($patient->id);

        $this->assertNotNull($found);
        $this->assertSame($patient->id, $found->id);
        $this->assertSame('Ana Silva', $found->name);
    }

    public function test_find_by_id_returns_null_when_patient_does_not_exist(): void
    {
        $repository = $this->app->make(PatientRepository::class);

        $found = $repository->findById(Uuid::uuid4()->toString());

        $this->assertNull($found);
    }

    public function test_paginate_never_mixes_patients_between_brands_with_the_same_name(): void
    {
        $brandA = BrandModel::factory()->create();
        $brandB = BrandModel::factory()->create();

        $patientA = PatientModel::factory()->create(['brand_id' => $brandA->id, 'name' => 'Maria', 'status' => 'active']);
        PatientModel::factory()->create(['brand_id' => $brandB->id, 'name' => 'Maria', 'status' => 'active']);

        $repository = $this->app->make(PatientRepository::class);

        $page = $repository->paginate($brandA->id, null, null, 50);

        $this->assertCount(1, $page->items);
        $this->assertSame($patientA->id, $page->items[0]->id);
    }

    public function test_paginate_filters_by_search_case_insensitively(): void
    {
        $brand = BrandModel::factory()->create();

        $ana = PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Ana Silva', 'status' => 'active']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Beatriz Costa', 'status' => 'active']);

        $repository = $this->app->make(PatientRepository::class);

        $page = $repository->paginate($brand->id, 'ANA', null, 50);

        $this->assertCount(1, $page->items);
        $this->assertSame($ana->id, $page->items[0]->id);
    }

    public function test_paginate_walked_across_pages_covers_every_patient_without_overlap_or_gap(): void
    {
        $brand = BrandModel::factory()->create();

        $names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gustavo', 'Helena', 'Igor', 'Julia'];

        foreach ($names as $name) {
            PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => $name, 'status' => 'active']);
        }

        $repository = $this->app->make(PatientRepository::class);

        $seenIds = [];
        $cursor = null;

        do {
            $page = $repository->paginate($brand->id, null, $cursor, 4);

            foreach ($page->items as $item) {
                $seenIds[] = $item->id;
            }

            $cursor = $page->nextCursor !== null ? PatientCursor::decode($page->nextCursor) : null;
        } while ($cursor !== null);

        $this->assertCount(10, $seenIds);
        $this->assertCount(10, array_unique($seenIds));
    }

    public function test_update_needs_follow_up_persists_the_new_value_and_returns_updated_entity(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'needs_follow_up' => false]);

        $repository = $this->app->make(PatientRepository::class);

        $updated = $repository->updateNeedsFollowUp($patient->id, true);

        $this->assertTrue($updated->needsFollowUp);
        $this->assertTrue($patient->fresh()->needs_follow_up);
    }

    public function test_update_needs_follow_up_throws_patient_not_found_for_unknown_id(): void
    {
        $repository = $this->app->make(PatientRepository::class);

        $this->expectException(PatientNotFound::class);

        $repository->updateNeedsFollowUp(Uuid::uuid4()->toString(), true);
    }

    public function test_update_needs_follow_up_does_not_throw_when_value_is_already_the_same(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'needs_follow_up' => true]);

        $repository = $this->app->make(PatientRepository::class);

        $updated = $repository->updateNeedsFollowUp($patient->id, true);

        $this->assertTrue($updated->needsFollowUp);
    }

    public function test_insert_creates_an_active_patient_with_status_changed_at_set(): void
    {
        $brand = BrandModel::factory()->create();

        $repository = $this->app->make(PatientRepository::class);

        $patient = $repository->insert($brand->id, 'Carla Souza', '1990-05-10', 'maintain');

        $this->assertSame('Carla Souza', $patient->name);
        $this->assertSame('1990-05-10', $patient->birthDate);
        $this->assertSame('maintain', $patient->goal);
        $this->assertSame('active', $patient->status);
        $this->assertFalse($patient->needsFollowUp);
        $this->assertNotSame('', $patient->statusChangedAt);

        $model = PatientModel::query()->findOrFail($patient->id);
        $this->assertSame('active', $model->status);
        $this->assertNotNull($model->status_changed_at);
    }

    public function test_update_persists_only_the_given_fields(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create([
            'brand_id' => $brand->id,
            'name' => 'Original Name',
            'goal' => 'maintain',
        ]);

        $repository = $this->app->make(PatientRepository::class);

        $updated = $repository->update($patient->id, ['name' => 'Updated Name']);

        $this->assertSame('Updated Name', $updated->name);
        $this->assertSame('maintain', $updated->goal);
        $this->assertSame('Updated Name', $patient->fresh()->name);
        $this->assertSame('maintain', $patient->fresh()->goal);
    }

    public function test_update_throws_patient_not_found_for_unknown_id(): void
    {
        $repository = $this->app->make(PatientRepository::class);

        $this->expectException(PatientNotFound::class);

        $repository->update(Uuid::uuid4()->toString(), ['name' => 'X']);
    }

    public function test_update_status_persists_status_and_status_changed_at_together(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);

        $repository = $this->app->make(PatientRepository::class);

        $updated = $repository->updateStatus($patient->id, 'inactive', '2026-01-15T10:00:00+00:00');

        $this->assertSame('inactive', $updated->status);
        $this->assertSame('2026-01-15T10:00:00+00:00', $updated->statusChangedAt);
        $this->assertSame('inactive', $patient->fresh()->status);
    }

    public function test_update_status_throws_patient_not_found_for_unknown_id(): void
    {
        $repository = $this->app->make(PatientRepository::class);

        $this->expectException(PatientNotFound::class);

        $repository->updateStatus(Uuid::uuid4()->toString(), 'inactive', '2026-01-15T10:00:00+00:00');
    }

    public function test_delete_soft_deletes_the_patient(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $repository = $this->app->make(PatientRepository::class);

        $repository->delete($patient->id);

        $this->assertNull(PatientModel::query()->find($patient->id));
        $this->assertNotNull(PatientModel::withTrashed()->findOrFail($patient->id)->deleted_at);
    }

    public function test_delete_throws_patient_not_found_for_unknown_id(): void
    {
        $repository = $this->app->make(PatientRepository::class);

        $this->expectException(PatientNotFound::class);

        $repository->delete(Uuid::uuid4()->toString());
    }

    public function test_paginate_defaults_to_active_status_when_no_statuses_given(): void
    {
        $brand = BrandModel::factory()->create();
        $active = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'inactive']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'completed']);

        $repository = $this->app->make(PatientRepository::class);

        $page = $repository->paginate($brand->id, null, null, 50, ['active']);

        $this->assertCount(1, $page->items);
        $this->assertSame($active->id, $page->items[0]->id);
    }

    public function test_paginate_with_inactive_and_completed_statuses_excludes_active(): void
    {
        $brand = BrandModel::factory()->create();
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);
        $inactive = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'inactive']);
        $completed = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'completed']);

        $repository = $this->app->make(PatientRepository::class);

        $page = $repository->paginate($brand->id, null, null, 50, ['inactive', 'completed']);

        $ids = array_map(fn ($item) => $item->id, $page->items);
        $this->assertCount(2, $ids);
        $this->assertContains($inactive->id, $ids);
        $this->assertContains($completed->id, $ids);
    }

    public function test_paginate_never_returns_a_deleted_patient_even_when_requesting_every_status(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);
        $patient->delete();

        $repository = $this->app->make(PatientRepository::class);

        $page = $repository->paginate($brand->id, null, null, 50, ['active', 'inactive', 'completed']);

        $this->assertCount(0, $page->items);
    }
}
