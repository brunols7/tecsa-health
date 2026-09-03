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

    public function test_patch_returns_422_when_birth_date_is_not_in_the_expected_format(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}", ['birthDate' => '15/06/1985']);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $response->assertJsonStructure(['error' => ['details' => ['birthDate']]]);
    }

    public function test_patch_returns_422_when_goal_is_outside_the_enum(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}", ['goal' => 'not-a-real-goal']);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $response->assertJsonStructure(['error' => ['details' => ['goal']]]);
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

    public function test_post_creates_a_patient_and_returns_201_with_location_header(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);

        $response = $this->postJson('/api/v1/patients', [
            'name' => 'Carla Souza',
            'birthDate' => '1985-06-15',
            'goal' => 'maintain',
            'brand' => 'nutri-care',
        ]);

        $response->assertStatus(201);
        $id = $response->json('id');
        $this->assertIsString($id);
        $response->assertHeader('Location', "/api/v1/patients/{$id}");
        $response->assertJsonPath('name', 'Carla Souza');
        $response->assertJsonPath('birthDate', '1985-06-15');
        $response->assertJsonPath('goal', 'maintain');
        $response->assertJsonPath('status', 'active');
        $response->assertJsonPath('needsFollowUp', false);
        $this->assertNotNull($response->json('statusChangedAt'));

        $show = $this->getJson($response->headers->get('Location'));
        $show->assertStatus(200);
        $show->assertJsonPath('name', 'Carla Souza');
        $show->assertJsonPath('status', 'active');
    }

    public function test_post_returns_422_when_name_is_missing(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);

        $response = $this->postJson('/api/v1/patients', [
            'birthDate' => '1985-06-15',
            'goal' => 'maintain',
            'brand' => 'nutri-care',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $response->assertJsonStructure(['error' => ['details' => ['name']]]);
    }

    public function test_post_returns_422_when_birth_date_is_not_in_the_expected_format(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);

        $response = $this->postJson('/api/v1/patients', [
            'name' => 'Carla Souza',
            'birthDate' => '15/06/1985',
            'goal' => 'maintain',
            'brand' => 'nutri-care',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $response->assertJsonStructure(['error' => ['details' => ['birthDate']]]);
    }

    public function test_post_returns_422_when_birth_date_is_in_the_future(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);

        $response = $this->postJson('/api/v1/patients', [
            'name' => 'Carla Souza',
            'birthDate' => now()->addDay()->format('Y-m-d'),
            'goal' => 'maintain',
            'brand' => 'nutri-care',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $response->assertJsonStructure(['error' => ['details' => ['birthDate']]]);
    }

    public function test_post_returns_422_when_goal_is_outside_the_enum(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);

        $response = $this->postJson('/api/v1/patients', [
            'name' => 'Carla Souza',
            'birthDate' => '1985-06-15',
            'goal' => 'not-a-real-goal',
            'brand' => 'nutri-care',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $response->assertJsonStructure(['error' => ['details' => ['goal']]]);
    }

    public function test_post_returns_422_when_brand_is_missing(): void
    {
        $response = $this->postJson('/api/v1/patients', [
            'name' => 'Carla Souza',
            'birthDate' => '1985-06-15',
            'goal' => 'maintain',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $response->assertJsonStructure(['error' => ['details' => ['brand']]]);
    }

    public function test_post_returns_404_when_brand_does_not_exist(): void
    {
        $response = $this->postJson('/api/v1/patients', [
            'name' => 'Carla Souza',
            'birthDate' => '1985-06-15',
            'goal' => 'maintain',
            'brand' => 'unknown-brand',
        ]);

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'BRAND_NOT_FOUND');
    }

    public function test_post_ignores_fields_outside_the_allowed_set(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);

        $response = $this->postJson('/api/v1/patients', [
            'name' => 'Carla Souza',
            'birthDate' => '1985-06-15',
            'goal' => 'maintain',
            'brand' => 'nutri-care',
            'status' => 'completed',
            'needsFollowUp' => true,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('status', 'active');
        $response->assertJsonPath('needsFollowUp', false);
    }

    public function test_status_transition_active_to_inactive_returns_200(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create([
            'brand_id' => $brand->id,
            'status' => 'active',
            'status_changed_at' => now()->subDays(10),
        ]);
        $before = $this->getJson("/api/v1/patients/{$patient->id}")->json('statusChangedAt');

        $response = $this->patchJson("/api/v1/patients/{$patient->id}/status", ['status' => 'inactive']);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'inactive');
        $this->assertNotNull($response->json('statusChangedAt'));
        $this->assertNotSame($before, $response->json('statusChangedAt'));
    }

    public function test_status_transition_active_to_completed_returns_200(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}/status", ['status' => 'completed']);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'completed');
    }

    public function test_status_transition_inactive_to_active_returns_200(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'inactive']);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}/status", ['status' => 'active']);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'active');
    }

    public function test_status_transition_completed_to_active_returns_200(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'completed']);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}/status", ['status' => 'active']);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'active');
    }

    public function test_status_transition_from_inactive_to_completed_returns_409_and_leaves_status_unchanged(): void
    {
        $brand = BrandModel::factory()->create();
        $statusChangedAt = now()->subDays(5);
        $patient = PatientModel::factory()->create([
            'brand_id' => $brand->id,
            'status' => 'inactive',
            'status_changed_at' => $statusChangedAt,
        ]);
        $before = $this->getJson("/api/v1/patients/{$patient->id}")->json('statusChangedAt');

        $response = $this->patchJson("/api/v1/patients/{$patient->id}/status", ['status' => 'completed']);

        $response->assertStatus(409);
        $response->assertJsonPath('error.code', 'INVALID_STATUS_TRANSITION');

        $show = $this->getJson("/api/v1/patients/{$patient->id}");
        $show->assertJsonPath('status', 'inactive');
        $this->assertSame($before, $show->json('statusChangedAt'));
    }

    public function test_status_transition_to_the_same_status_returns_409(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}/status", ['status' => 'active']);

        $response->assertStatus(409);
        $response->assertJsonPath('error.code', 'INVALID_STATUS_TRANSITION');
    }

    public function test_status_transition_returns_422_when_status_is_outside_the_enum(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);

        $response = $this->patchJson("/api/v1/patients/{$patient->id}/status", ['status' => 'not-a-real-status']);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_status_transition_returns_404_for_nonexistent_patient(): void
    {
        $response = $this->patchJson('/api/v1/patients/'.Uuid::uuid4()->toString().'/status', ['status' => 'inactive']);

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_delete_soft_deletes_a_patient_and_returns_204(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->deleteJson("/api/v1/patients/{$patient->id}");

        $response->assertStatus(204);
        $response->assertNoContent();
    }

    public function test_delete_returns_404_for_nonexistent_patient(): void
    {
        $response = $this->deleteJson('/api/v1/patients/'.Uuid::uuid4()->toString());

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_deleting_the_same_patient_twice_returns_404_on_the_second_call(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $first = $this->deleteJson("/api/v1/patients/{$patient->id}");
        $first->assertStatus(204);

        $second = $this->deleteJson("/api/v1/patients/{$patient->id}");
        $second->assertStatus(404);
        $second->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_delete_preserves_biomarker_rows_in_the_database(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $biomarker = BiomarkerModel::factory()->create(['patient_id' => $patient->id]);

        $this->deleteJson("/api/v1/patients/{$patient->id}")->assertStatus(204);

        $this->assertDatabaseHas('biomarkers', ['id' => $biomarker->id, 'patient_id' => $patient->id]);
    }

    public function test_deleted_patient_disappears_from_every_read_and_write_endpoint(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);
        BiomarkerModel::factory()->create(['patient_id' => $patient->id]);

        $this->deleteJson("/api/v1/patients/{$patient->id}")->assertStatus(204);

        $this->getJson("/api/v1/patients/{$patient->id}")
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');

        $this->getJson("/api/v1/patients/{$patient->id}/biomarkers")
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');

        $this->patchJson("/api/v1/patients/{$patient->id}", ['name' => 'Nome Novo'])
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');

        $this->patchJson("/api/v1/patients/{$patient->id}/status", ['status' => 'inactive'])
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');

        $list = $this->getJson('/api/v1/patients?brand=nutri-care&status=active,inactive,completed');
        $list->assertStatus(200);
        $this->assertNotContains($patient->id, collect($list->json('data'))->pluck('id')->all());
    }

    public function test_get_patients_without_status_param_defaults_to_active_only(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        $active = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'inactive']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'completed']);

        $response = $this->getJson('/api/v1/patients?brand=nutri-care');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $active->id);
    }

    public function test_get_patients_with_status_filter_returns_only_the_requested_statuses(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);
        $inactive = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'inactive']);
        $completed = PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'completed']);

        $response = $this->getJson('/api/v1/patients?brand=nutri-care&status=inactive,completed');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$inactive->id, $completed->id], $ids);
    }

    public function test_get_patients_with_all_three_statuses_returns_all_of_them(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'inactive']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'completed']);

        $response = $this->getJson('/api/v1/patients?brand=nutri-care&status=active,inactive,completed');

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');
    }

    public function test_get_patients_returns_400_when_status_filter_has_an_invalid_value(): void
    {
        $brand = BrandModel::factory()->create(['slug' => 'nutri-care']);
        PatientModel::factory()->create(['brand_id' => $brand->id, 'status' => 'active']);

        $response = $this->getJson('/api/v1/patients?brand=nutri-care&status=invalido');

        $response->assertStatus(400);
        $response->assertJsonPath('error.code', 'INVALID_STATUS_FILTER');
    }

    public function test_creates_a_biomarker_and_returns_201_with_location_and_body(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->postJson("/api/v1/patients/{$patient->id}/biomarkers", [
            'label' => 'Ferro sérico',
            'value' => 40,
            'unit' => 'ng/mL',
            'refMin' => 20,
            'refMax' => 200,
            'measuredAt' => '2026-01-15',
        ]);

        $response->assertStatus(201);
        $response->assertHeader('Location', "/api/v1/patients/{$patient->id}/biomarkers");
        $response->assertJsonStructure(['id', 'code', 'label', 'value', 'unit', 'refMin', 'refMax', 'measuredAt', 'status']);
        $response->assertJsonPath('code', 'ferro_serico');
        $response->assertJsonPath('label', 'Ferro sérico');
        $response->assertJsonPath('status', 'normal');
    }

    public function test_created_biomarker_persists_and_is_readable_via_list(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $this->postJson("/api/v1/patients/{$patient->id}/biomarkers", [
            'label' => 'Ferritina',
            'value' => 40,
            'unit' => 'ng/mL',
            'refMin' => 20,
            'refMax' => 200,
            'measuredAt' => '2026-01-15',
        ])->assertStatus(201);

        $list = $this->getJson("/api/v1/patients/{$patient->id}/biomarkers");

        $list->assertStatus(200);
        $list->assertJsonCount(1);
        $list->assertJsonPath('0.label', 'Ferritina');
    }

    public function test_create_biomarker_returns_422_when_label_is_empty(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->postJson("/api/v1/patients/{$patient->id}/biomarkers", [
            'label' => '',
            'value' => 40,
            'unit' => 'ng/mL',
            'refMin' => 20,
            'refMax' => 200,
            'measuredAt' => '2026-01-15',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_create_biomarker_returns_422_when_value_is_not_numeric(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->postJson("/api/v1/patients/{$patient->id}/biomarkers", [
            'label' => 'Ferritina',
            'value' => 'not-a-number',
            'unit' => 'ng/mL',
            'refMin' => 20,
            'refMax' => 200,
            'measuredAt' => '2026-01-15',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_create_biomarker_returns_422_when_ref_min_is_greater_than_or_equal_to_ref_max(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->postJson("/api/v1/patients/{$patient->id}/biomarkers", [
            'label' => 'Ferritina',
            'value' => 40,
            'unit' => 'ng/mL',
            'refMin' => 200,
            'refMax' => 200,
            'measuredAt' => '2026-01-15',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_create_biomarker_returns_422_when_value_is_less_than_or_equal_to_zero(): void
    {
        $brand = BrandModel::factory()->create();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->postJson("/api/v1/patients/{$patient->id}/biomarkers", [
            'label' => 'Ferritina',
            'value' => 0,
            'unit' => 'ng/mL',
            'refMin' => 20,
            'refMax' => 200,
            'measuredAt' => '2026-01-15',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_create_biomarker_returns_404_when_patient_does_not_exist(): void
    {
        $response = $this->postJson('/api/v1/patients/'.Uuid::uuid4()->toString().'/biomarkers', [
            'label' => 'Ferritina',
            'value' => 40,
            'unit' => 'ng/mL',
            'refMin' => 20,
            'refMax' => 200,
            'measuredAt' => '2026-01-15',
        ]);

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }
}
