<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Infrastructure\Persistence\Eloquent\Models\Biomarker as BiomarkerModel;
use App\Infrastructure\Persistence\Eloquent\Models\Brand as BrandModel;
use App\Infrastructure\Persistence\Eloquent\Models\Patient as PatientModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Ramsey\Uuid\Uuid;
use Tests\TestCase;

class PatientControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_patients_for_a_known_brand_with_next_cursor(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        PatientModel::factory()->count(3)->create(['brand_id' => $brand->id, 'status' => 'active']);

        $response = $this->getJson('/api/v1/patients?brand=nutri-care&limit=2');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data', 'nextCursor']);
        $response->assertJsonCount(2, 'data');
        $this->assertNotNull($response->json('nextCursor'));
    }

    public function test_paginating_through_next_cursor_covers_every_patient_without_overlap(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        PatientModel::factory()->count(5)->create(['brand_id' => $brand->id, 'status' => 'active']);

        $firstPage = $this->getJson('/api/v1/patients?brand=nutri-care&limit=3');
        $firstPage->assertStatus(200);

        $firstIds = collect($firstPage->json('data'))->pluck('id')->all();
        $nextCursor = $firstPage->json('nextCursor');

        $this->assertNotNull($nextCursor);
        $this->assertCount(3, $firstIds);

        $secondPage = $this->getJson('/api/v1/patients?brand=nutri-care&limit=3&cursor='.urlencode($nextCursor));
        $secondPage->assertStatus(200);

        $secondIds = collect($secondPage->json('data'))->pluck('id')->all();

        $this->assertCount(2, $secondIds);
        $this->assertNull($secondPage->json('nextCursor'));
        $this->assertEmpty(array_intersect($firstIds, $secondIds));
        $this->assertCount(5, array_unique(array_merge($firstIds, $secondIds)));
    }

    public function test_filters_patients_by_search_term(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Ana Silva', 'status' => 'active']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Beatriz Costa', 'status' => 'active']);

        $response = $this->getJson('/api/v1/patients?brand=nutri-care&search=ana');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Ana Silva');
    }

    public function test_returns_422_when_brand_param_is_missing(): void
    {
        $response = $this->getJson('/api/v1/patients');

        $response->assertStatus(422);
        $response->assertJsonStructure(['error' => ['code', 'message', 'details']]);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_returns_404_when_brand_does_not_exist(): void
    {
        $response = $this->getJson('/api/v1/patients?brand=unknown-brand');

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'BRAND_NOT_FOUND');
    }

    public function test_returns_400_when_cursor_is_not_decodable(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->getJson('/api/v1/patients?brand=nutri-care&cursor=not-a-valid-cursor');

        $response->assertStatus(400);
        $response->assertJsonPath('error.code', 'INVALID_CURSOR');
    }

    public function test_shows_a_patient_by_id(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Ana Silva']);

        $response = $this->getJson("/api/v1/patients/{$patient->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'id' => $patient->id,
            'name' => 'Ana Silva',
            'needsFollowUp' => false,
        ]);
        $response->assertJsonStructure(['id', 'name', 'birthDate', 'goal', 'status', 'needsFollowUp', 'updatedAt']);
    }

    public function test_returns_404_when_patient_id_does_not_exist(): void
    {
        $response = $this->getJson('/api/v1/patients/'.Uuid::uuid4()->toString());

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_returns_404_when_patient_id_is_not_a_well_formed_uuid(): void
    {
        $response = $this->getJson('/api/v1/patients/not-a-uuid');

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_lists_biomarkers_with_derived_status_for_a_patient(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        BiomarkerModel::factory()->create(['patient_id' => $patient->id]);
        BiomarkerModel::factory()->outOfRange()->create(['patient_id' => $patient->id]);

        $response = $this->getJson("/api/v1/patients/{$patient->id}/biomarkers");

        $response->assertStatus(200);
        $response->assertJsonCount(2);
        $response->assertJsonStructure([
            '*' => ['id', 'code', 'label', 'value', 'unit', 'refMin', 'refMax', 'measuredAt', 'status'],
        ]);
    }

    public function test_returns_empty_array_when_patient_has_no_biomarkers(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->getJson("/api/v1/patients/{$patient->id}/biomarkers");

        $response->assertStatus(200);
        $response->assertExactJson([]);
    }

    public function test_returns_404_when_listing_biomarkers_for_a_nonexistent_patient(): void
    {
        $response = $this->getJson('/api/v1/patients/'.Uuid::uuid4()->toString().'/biomarkers');

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_patch_sets_needs_follow_up_to_true_and_persists_it(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'needs_follow_up' => false]);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}", ['needsFollowUp' => true]);

        $response->assertStatus(200);
        $response->assertJsonPath('needsFollowUp', true);

        $follow = $this->getJson("/api/v1/patients/{$patient->id}");
        $follow->assertJsonPath('needsFollowUp', true);
    }

    public function test_patch_sets_needs_follow_up_to_false_and_persists_it(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'needs_follow_up' => true]);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}", ['needsFollowUp' => false]);

        $response->assertStatus(200);
        $response->assertJsonPath('needsFollowUp', false);

        $follow = $this->getJson("/api/v1/patients/{$patient->id}");
        $follow->assertJsonPath('needsFollowUp', false);
    }

    public function test_patch_returns_404_for_nonexistent_patient_without_persisting(): void
    {
        $response = $this->patchJson('/api/v1/patients/'.Uuid::uuid4()->toString(), ['needsFollowUp' => true]);

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_patch_returns_422_when_needs_follow_up_is_missing(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}", []);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_patch_returns_422_when_needs_follow_up_is_not_boolean(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}", ['needsFollowUp' => 'not-a-boolean']);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_patch_ignores_fields_outside_the_allowed_set(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Ana Silva', 'needs_follow_up' => false]);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}", [
            'needsFollowUp' => true,
            'status' => 'completed',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('needsFollowUp', true);
        $response->assertJsonPath('status', 'active');
    }

    public function test_patch_updates_name_and_leaves_other_fields_unchanged(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create([
            'brand_id' => $brand->id,
            'name' => 'Ana Silva',
            'birth_date' => '1990-01-01',
            'goal' => 'lose_weight',
            'needs_follow_up' => false,
        ]);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}", ['name' => 'Ana Silva Santos']);

        $response->assertStatus(200);
        $response->assertJsonPath('name', 'Ana Silva Santos');
        $response->assertJsonPath('birthDate', '1990-01-01');
        $response->assertJsonPath('goal', 'lose_weight');
        $response->assertJsonPath('needsFollowUp', false);
    }
}
