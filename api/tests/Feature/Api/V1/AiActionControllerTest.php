<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Domain\AiAction\AiSuggestedAction;
use App\Domain\AiAction\AiSuggestion;
use App\Domain\AiAction\Exceptions\LlmInvalidResponse;
use App\Domain\AiAction\Exceptions\LlmTimeout;
use App\Domain\AiAction\LlmClient;
use App\Infrastructure\Llm\FakeLlmClient;
use App\Infrastructure\Persistence\Eloquent\Models\AiAction as AiActionModel;
use App\Infrastructure\Persistence\Eloquent\Models\Biomarker as BiomarkerModel;
use App\Infrastructure\Persistence\Eloquent\Models\Brand as BrandModel;
use App\Infrastructure\Persistence\Eloquent\Models\FeatureFlag as FeatureFlagModel;
use App\Infrastructure\Persistence\Eloquent\Models\Patient as PatientModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Ramsey\Uuid\Uuid;
use Tests\TestCase;

class AiActionControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    private function brand(bool $aiEnabled = true): BrandModel
    {
        $brand = BrandModel::factory()->create();

        FeatureFlagModel::query()->create([
            'brand_id' => $brand->id,
            'key' => 'aiActionsEnabled',
            'enabled' => $aiEnabled,
        ]);

        return $brand;
    }

    private function patientWithBiomarker(BrandModel $brand): PatientModel
    {
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        BiomarkerModel::factory()->create(['patient_id' => $patient->id]);

        return $patient;
    }

    private function suggestion(): AiSuggestion
    {
        return new AiSuggestion(
            riskLevel: 'moderate',
            summary: 'Glicemia levemente elevada.',
            actions: [
                new AiSuggestedAction(
                    title: 'Reduzir açúcar refinado',
                    rationale: 'Glicemia acima da faixa de referência.',
                    biomarkers: ['glucose'],
                    priority: 'medium',
                ),
            ],
        );
    }

    private function bindFakeLlm(): FakeLlmClient
    {
        $fake = new FakeLlmClient;
        $this->app->instance(LlmClient::class, $fake);

        return $fake;
    }

    public function test_post_generates_actions_then_cache_hits_on_second_call(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith($this->suggestion());

        $first = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
        $first->assertStatus(201);
        $first->assertJsonStructure(['*' => ['id', 'patientId', 'title', 'rationale', 'priority', 'biomarkers', 'status', 'createdAt']]);
        $first->assertJsonPath('0.status', 'pending');
        $firstIds = collect($first->json())->pluck('id')->all();

        $second = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
        $second->assertStatus(200);
        $secondIds = collect($second->json())->pluck('id')->all();

        $this->assertSame($firstIds, $secondIds);
        $this->assertSame(1, $fake->timesCalled());
    }

    public function test_post_with_refresh_calls_llm_again_and_appends_to_existing_actions(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith($this->suggestion());

        $first = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
        $first->assertStatus(201);
        $firstIds = collect($first->json())->pluck('id')->all();

        $fake->respondWith(new AiSuggestion(
            riskLevel: 'low',
            summary: 'Nova sugestão.',
            actions: [
                new AiSuggestedAction(
                    title: 'Aumentar ingestão de fibras',
                    rationale: 'Complementa a primeira sugestão.',
                    biomarkers: ['glucose'],
                    priority: 'low',
                ),
            ],
        ));

        $refreshed = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions", ['refresh' => true]);
        $refreshed->assertStatus(201);
        $refreshed->assertJsonCount(2);

        $refreshedIds = collect($refreshed->json())->pluck('id')->all();
        $this->assertEquals($firstIds, array_intersect($firstIds, $refreshedIds));
        $this->assertSame(2, $fake->timesCalled());
        $this->assertSame(2, AiActionModel::query()->where('patient_id', $patient->id)->count());
        $this->assertSame(
            1,
            AiActionModel::query()->where('patient_id', $patient->id)->distinct('input_hash')->count('input_hash'),
        );
    }

    public function test_post_without_refresh_still_hits_cache_and_never_appends(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith($this->suggestion());

        $this->postJson("/api/v1/patients/{$patient->id}/ai-actions")->assertStatus(201);

        $second = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions", ['refresh' => false]);
        $second->assertStatus(200);
        $second->assertJsonCount(1);
        $this->assertSame(1, $fake->timesCalled());
    }

    public function test_post_returns_404_when_patient_does_not_exist(): void
    {
        $this->bindFakeLlm();

        $response = $this->postJson('/api/v1/patients/'.Uuid::uuid4()->toString().'/ai-actions');

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_post_returns_422_when_patient_has_no_biomarkers(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $this->bindFakeLlm();

        $response = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'PATIENT_NO_BIOMARKERS');
    }

    public function test_post_with_refresh_returns_422_when_patient_has_no_biomarkers(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $this->bindFakeLlm();

        $response = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions", ['refresh' => true]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'PATIENT_NO_BIOMARKERS');
    }

    public function test_post_returns_503_when_kill_switch_is_off(): void
    {
        $brand = $this->brand(aiEnabled: false);
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();

        $response = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");

        $response->assertStatus(503);
        $response->assertJsonPath('error.code', 'AI_DISABLED');
        $this->assertSame(0, $fake->timesCalled());
    }

    public function test_post_with_refresh_returns_503_when_kill_switch_is_off(): void
    {
        $brand = $this->brand(aiEnabled: false);
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();

        $response = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions", ['refresh' => true]);

        $response->assertStatus(503);
        $response->assertJsonPath('error.code', 'AI_DISABLED');
        $this->assertSame(0, $fake->timesCalled());
    }

    public function test_post_returns_502_when_llm_times_out(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->failWith(new LlmTimeout(15));

        $response = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");

        $response->assertStatus(502);
        $response->assertJsonPath('error.code', 'AI_UNAVAILABLE');
        $this->assertSame(0, AiActionModel::query()->where('patient_id', $patient->id)->count());
    }

    public function test_post_returns_502_after_one_retry_when_schema_is_invalid_twice(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->failWith(new LlmInvalidResponse('missing field'));
        $fake->failWith(new LlmInvalidResponse('missing field'));

        $response = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");

        $response->assertStatus(502);
        $response->assertJsonPath('error.code', 'AI_UNAVAILABLE');
        $this->assertSame(2, $fake->timesCalled());
        $this->assertSame(0, AiActionModel::query()->where('patient_id', $patient->id)->count());
    }

    public function test_post_with_refresh_returns_502_after_one_retry_and_keeps_existing_actions(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith($this->suggestion());

        $first = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
        $first->assertStatus(201);
        $existingId = collect($first->json())->pluck('id')->first();

        $fake->failWith(new LlmInvalidResponse('missing field'));
        $fake->failWith(new LlmInvalidResponse('missing field'));

        $refreshed = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions", ['refresh' => true]);

        $refreshed->assertStatus(502);
        $refreshed->assertJsonPath('error.code', 'AI_UNAVAILABLE');
        $this->assertSame(3, $fake->timesCalled());
        $this->assertSame(1, AiActionModel::query()->where('patient_id', $patient->id)->count());
        $this->assertTrue(AiActionModel::query()->whereKey($existingId)->exists());
    }

    public function test_get_returns_empty_list_when_patient_has_no_history(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);

        $response = $this->getJson("/api/v1/patients/{$patient->id}/ai-actions");

        $response->assertStatus(200);
        $response->assertExactJson([]);
    }

    public function test_get_returns_generated_actions_after_a_post(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith($this->suggestion());

        $this->postJson("/api/v1/patients/{$patient->id}/ai-actions")->assertStatus(201);

        $response = $this->getJson("/api/v1/patients/{$patient->id}/ai-actions");

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.title', 'Reduzir açúcar refinado');
    }

    public function test_get_returns_404_when_patient_does_not_exist(): void
    {
        $response = $this->getJson('/api/v1/patients/'.Uuid::uuid4()->toString().'/ai-actions');

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'PATIENT_NOT_FOUND');
    }

    public function test_get_returns_503_when_kill_switch_is_off(): void
    {
        $brand = $this->brand(aiEnabled: false);
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);

        $response = $this->getJson("/api/v1/patients/{$patient->id}/ai-actions");

        $response->assertStatus(503);
        $response->assertJsonPath('error.code', 'AI_DISABLED');
    }

    public function test_patch_accepts_a_pending_action(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id));

        $response = $this->patchJson("/api/v1/ai-actions/{$action->id}", ['status' => 'accepted']);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'accepted');
        $this->assertSame('accepted', $action->fresh()->status);
    }

    public function test_patch_dismisses_a_pending_action(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id));

        $response = $this->patchJson("/api/v1/ai-actions/{$action->id}", ['status' => 'dismissed']);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'dismissed');
        $this->assertSame('dismissed', $action->fresh()->status);
    }

    public function test_patch_returns_404_when_action_does_not_exist(): void
    {
        $response = $this->patchJson('/api/v1/ai-actions/'.Uuid::uuid4()->toString(), ['status' => 'accepted']);

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'AI_ACTION_NOT_FOUND');
    }

    public function test_patch_returns_409_when_action_is_already_resolved(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id, status: 'accepted'));

        $response = $this->patchJson("/api/v1/ai-actions/{$action->id}", ['status' => 'dismissed']);

        $response->assertStatus(409);
        $response->assertJsonPath('error.code', 'AI_ACTION_ALREADY_RESOLVED');
        $this->assertSame('accepted', $action->fresh()->status);
    }

    public function test_patch_returns_422_when_status_is_missing(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id));

        $response = $this->patchJson("/api/v1/ai-actions/{$action->id}", []);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
        $this->assertSame('pending', $action->fresh()->status);
    }

    public function test_patch_returns_422_when_status_is_not_a_valid_value(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id));

        $response = $this->patchJson("/api/v1/ai-actions/{$action->id}", ['status' => 'pending']);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_patch_returns_503_when_kill_switch_is_off(): void
    {
        $brand = $this->brand(aiEnabled: false);
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id));

        $response = $this->patchJson("/api/v1/ai-actions/{$action->id}", ['status' => 'accepted']);

        $response->assertStatus(503);
        $response->assertJsonPath('error.code', 'AI_DISABLED');
        $this->assertSame('pending', $action->fresh()->status);
    }

    public function test_delete_soft_deletes_an_accepted_action_and_returns_204(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id, status: 'accepted'));

        $response = $this->deleteJson("/api/v1/ai-actions/{$action->id}");

        $response->assertStatus(204);
        $response->assertNoContent();
        $this->assertSame('deleted', $action->fresh()->status);
    }

    public function test_delete_soft_deletes_a_dismissed_action_and_returns_204(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id, status: 'dismissed'));

        $response = $this->deleteJson("/api/v1/ai-actions/{$action->id}");

        $response->assertStatus(204);
        $this->assertSame('deleted', $action->fresh()->status);
    }

    public function test_delete_returns_404_when_action_does_not_exist(): void
    {
        $response = $this->deleteJson('/api/v1/ai-actions/'.Uuid::uuid4()->toString());

        $response->assertStatus(404);
        $response->assertJsonPath('error.code', 'AI_ACTION_NOT_FOUND');
    }

    public function test_delete_returns_409_when_action_is_pending(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id));

        $response = $this->deleteJson("/api/v1/ai-actions/{$action->id}");

        $response->assertStatus(409);
        $response->assertJsonPath('error.code', 'AI_ACTION_ALREADY_RESOLVED');
        $this->assertSame('pending', $action->fresh()->status);
    }

    public function test_delete_returns_409_when_action_is_already_deleted(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id, status: 'deleted'));

        $response = $this->deleteJson("/api/v1/ai-actions/{$action->id}");

        $response->assertStatus(409);
        $response->assertJsonPath('error.code', 'AI_ACTION_ALREADY_RESOLVED');
    }

    public function test_delete_returns_503_when_kill_switch_is_off(): void
    {
        $brand = $this->brand(aiEnabled: false);
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id, status: 'accepted'));

        $response = $this->deleteJson("/api/v1/ai-actions/{$action->id}");

        $response->assertStatus(503);
        $response->assertJsonPath('error.code', 'AI_DISABLED');
        $this->assertSame('accepted', $action->fresh()->status);
    }

    public function test_get_excludes_deleted_actions_from_the_list(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        AiActionModel::query()->create($this->rowFor($patient->id, title: 'Ativa', status: 'accepted'));
        AiActionModel::query()->create($this->rowFor($patient->id, title: 'Excluída', status: 'deleted'));

        $response = $this->getJson("/api/v1/patients/{$patient->id}/ai-actions");

        $response->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.title', 'Ativa');
    }

    public function test_post_after_deleting_the_only_action_no_longer_cache_hits_on_it(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith($this->suggestion());

        $first = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
        $first->assertStatus(201);
        $deletedTitle = collect($first->json())->pluck('title')->first();
        $actionId = collect($first->json())->pluck('id')->first();

        $this->patchJson("/api/v1/ai-actions/{$actionId}", ['status' => 'accepted'])->assertStatus(200);
        $this->deleteJson("/api/v1/ai-actions/{$actionId}")->assertStatus(204);

        $fake->respondWith(new AiSuggestion(
            riskLevel: 'low',
            summary: 'Nova sugestão após exclusão.',
            actions: [
                new AiSuggestedAction(
                    title: 'Reavaliar em 30 dias',
                    rationale: 'Nenhuma ação ativa restante para este paciente.',
                    biomarkers: ['glucose'],
                    priority: 'low',
                ),
            ],
        ));

        $afterDelete = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
        $afterDelete->assertStatus(201);
        $afterDelete->assertJsonCount(1);
        $titles = collect($afterDelete->json())->pluck('title')->all();
        $this->assertNotContains($deletedTitle, $titles);
        $this->assertSame(['Reavaliar em 30 dias'], $titles);
    }

    public function test_post_cache_hit_excludes_a_deleted_action_but_keeps_the_surviving_one(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith(new AiSuggestion(
            riskLevel: 'moderate',
            summary: 'Duas sugestões.',
            actions: [
                new AiSuggestedAction(
                    title: 'Ação que será excluída',
                    rationale: 'r',
                    biomarkers: ['glucose'],
                    priority: 'medium',
                ),
                new AiSuggestedAction(
                    title: 'Ação que sobrevive',
                    rationale: 'r',
                    biomarkers: ['glucose'],
                    priority: 'low',
                ),
            ],
        ));

        $first = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
        $first->assertStatus(201);
        $first->assertJsonCount(2);
        $toDelete = collect($first->json())->firstWhere('title', 'Ação que será excluída');

        $this->patchJson("/api/v1/ai-actions/{$toDelete['id']}", ['status' => 'accepted'])->assertStatus(200);
        $this->deleteJson("/api/v1/ai-actions/{$toDelete['id']}")->assertStatus(204);

        $cacheHit = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");

        $cacheHit->assertStatus(200);
        $cacheHit->assertJsonCount(1);
        $cacheHit->assertJsonPath('0.title', 'Ação que sobrevive');
        $this->assertSame(1, $fake->timesCalled());
    }

    public function test_patch_ignores_fields_other_than_status(): void
    {
        $brand = $this->brand();
        $patient = PatientModel::factory()->create(['brand_id' => $brand->id]);
        $action = AiActionModel::query()->create($this->rowFor($patient->id, title: 'Reduzir açúcar'));

        $response = $this->patchJson("/api/v1/ai-actions/{$action->id}", [
            'status' => 'accepted',
            'title' => 'Hacked title',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'accepted');
        $response->assertJsonPath('title', 'Reduzir açúcar');
    }

    public function test_eleventh_post_within_the_window_is_rate_limited(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith($this->suggestion());

        for ($i = 1; $i <= 10; $i++) {
            $response = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
            $response->assertStatus($i === 1 ? 201 : 200);
        }

        $eleventh = $this->postJson("/api/v1/patients/{$patient->id}/ai-actions");
        $eleventh->assertStatus(429);
        $this->assertSame(1, $fake->timesCalled());
    }

    public function test_rate_limit_does_not_apply_to_get_or_patch(): void
    {
        $brand = $this->brand();
        $patient = $this->patientWithBiomarker($brand);
        $fake = $this->bindFakeLlm();
        $fake->respondWith($this->suggestion());

        for ($i = 1; $i <= 10; $i++) {
            $this->postJson("/api/v1/patients/{$patient->id}/ai-actions")->assertStatus($i === 1 ? 201 : 200);
        }
        $this->postJson("/api/v1/patients/{$patient->id}/ai-actions")->assertStatus(429);

        $get = $this->getJson("/api/v1/patients/{$patient->id}/ai-actions");
        $get->assertStatus(200);

        $action = AiActionModel::query()->where('patient_id', $patient->id)->firstOrFail();
        $patch = $this->patchJson("/api/v1/ai-actions/{$action->id}", ['status' => 'accepted']);
        $patch->assertStatus(200);
    }

    /**
     * @return array<string, mixed>
     */
    private function rowFor(string $patientId, string $title = 'Reduzir açúcar', string $status = 'pending'): array
    {
        return [
            'id' => Uuid::uuid4()->toString(),
            'patient_id' => $patientId,
            'title' => $title,
            'rationale' => 'Porque sim',
            'priority' => 'medium',
            'biomarkers' => ['glucose'],
            'status' => $status,
            'input_hash' => 'hash-'.Uuid::uuid4()->toString(),
            'created_at' => '2026-01-01T00:00:00+00:00',
        ];
    }
}
