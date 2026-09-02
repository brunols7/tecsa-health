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

        $patientA = PatientModel::factory()->create(['brand_id' => $brandA->id, 'name' => 'Maria']);
        PatientModel::factory()->create(['brand_id' => $brandB->id, 'name' => 'Maria']);

        $repository = $this->app->make(PatientRepository::class);

        $page = $repository->paginate($brandA->id, null, null, 50);

        $this->assertCount(1, $page->items);
        $this->assertSame($patientA->id, $page->items[0]->id);
    }

    public function test_paginate_filters_by_search_case_insensitively(): void
    {
        $brand = BrandModel::factory()->create();

        $ana = PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Ana Silva']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Beatriz Costa']);

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
            PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => $name]);
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
}
