<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Application\AiAction\AiActionService;
use App\Domain\AiAction\AiAction;
use App\Domain\AiAction\AiActionRepository;
use App\Domain\AiAction\AiActionStatus;
use App\Domain\AiAction\AiSuggestedAction;
use App\Domain\AiAction\AiSuggestion;
use App\Domain\AiAction\Exceptions\AiDisabled;
use App\Domain\AiAction\Exceptions\LlmInvalidResponse;
use App\Domain\AiAction\Exceptions\LlmTimeout;
use App\Domain\AiAction\Exceptions\LlmUnavailable;
use App\Domain\AiAction\Exceptions\PatientNoBiomarkers;
use App\Domain\Biomarker\Biomarker;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Biomarker\BiomarkerStatus;
use App\Domain\FeatureFlag\FeatureFlag;
use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Domain\Patient\Exceptions\PatientNotFound;
use App\Domain\Patient\Patient;
use App\Domain\Patient\PatientRepository;
use App\Infrastructure\Llm\FakeLlmClient;
use Mockery;
use Tests\TestCase;

class AiActionServiceTest extends TestCase
{
    private const PATIENT_ID = '11111111-1111-1111-1111-111111111111';

    private const BRAND_ID = 'brand-1';

    private function patient(): Patient
    {
        return new Patient(
            id: self::PATIENT_ID,
            brandId: self::BRAND_ID,
            name: 'Ana Silva',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: 'active',
            needsFollowUp: false,
            updatedAt: '2026-01-01T00:00:00+00:00',
        );
    }

    /**
     * @return array<int, Biomarker>
     */
    private function biomarkers(): array
    {
        return [
            new Biomarker(
                id: 'bio-1',
                patientId: self::PATIENT_ID,
                code: 'glucose',
                label: 'Glicemia',
                value: 110.0,
                unit: 'mg/dL',
                refMin: 70.0,
                refMax: 99.0,
                measuredAt: '2026-01-01T00:00:00+00:00',
                status: BiomarkerStatus::High,
            ),
        ];
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

    private function enabledFlag(): FeatureFlag
    {
        return new FeatureFlag(key: 'aiActionsEnabled', brandId: self::BRAND_ID, enabled: true);
    }

    public function test_cache_miss_calls_llm_once_persists_actions_and_marks_generated(): void
    {
        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with(self::PATIENT_ID)->andReturn($this->patient());

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('listForPatient')->with(self::PATIENT_ID)->andReturn($this->biomarkers());

        $flags = Mockery::mock(FeatureFlagRepository::class);
        $flags->shouldReceive('findByKeyAndBrand')->with('aiActionsEnabled', self::BRAND_ID)->andReturn($this->enabledFlag());

        $aiActions = Mockery::mock(AiActionRepository::class);
        $aiActions->shouldReceive('findByPatientAndHash')->once()->andReturn([]);
        $aiActions->shouldReceive('insertMany')->once()->with(Mockery::on(function (array $actions) {
            return count($actions) === 1
                && $actions[0]->patientId === self::PATIENT_ID
                && $actions[0]->status->value() === 'pending';
        }));

        $llm = new FakeLlmClient;
        $llm->respondWith($this->suggestion());

        $service = new AiActionService($patients, $biomarkers, $flags, $aiActions, $llm);

        $result = $service->generate(self::PATIENT_ID);

        $this->assertTrue($result->generated);
        $this->assertCount(1, $result->actions);
        $this->assertSame(1, $llm->timesCalled());
    }

    public function test_cache_hit_never_calls_llm_and_returns_existing_actions(): void
    {
        $existing = [new AiAction(
            id: 'existing-action-1',
            patientId: self::PATIENT_ID,
            title: 'Manter rotina',
            rationale: 'Biomarcadores estáveis desde a última geração.',
            priority: 'low',
            biomarkers: ['glucose'],
            status: AiActionStatus::Pending,
            inputHash: 'existing-hash',
            createdAt: '2026-01-01T00:00:00+00:00',
        )];

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with(self::PATIENT_ID)->andReturn($this->patient());

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('listForPatient')->with(self::PATIENT_ID)->andReturn($this->biomarkers());

        $flags = Mockery::mock(FeatureFlagRepository::class);
        $flags->shouldReceive('findByKeyAndBrand')->with('aiActionsEnabled', self::BRAND_ID)->andReturn($this->enabledFlag());

        $aiActions = Mockery::mock(AiActionRepository::class);
        $aiActions->shouldReceive('findByPatientAndHash')->once()->andReturn($existing);
        $aiActions->shouldNotReceive('insertMany');

        $llm = new FakeLlmClient;

        $service = new AiActionService($patients, $biomarkers, $flags, $aiActions, $llm);

        $result = $service->generate(self::PATIENT_ID);

        $this->assertFalse($result->generated);
        $this->assertSame($existing, $result->actions);
        $this->assertSame(0, $llm->timesCalled());
    }

    public function test_throws_patient_not_found_when_patient_does_not_exist(): void
    {
        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->andReturn(null);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldNotReceive('listForPatient');

        $flags = Mockery::mock(FeatureFlagRepository::class);
        $flags->shouldNotReceive('findByKeyAndBrand');

        $aiActions = Mockery::mock(AiActionRepository::class);
        $aiActions->shouldNotReceive('insertMany');

        $llm = new FakeLlmClient;

        $service = new AiActionService($patients, $biomarkers, $flags, $aiActions, $llm);

        $this->expectException(PatientNotFound::class);

        $service->generate('22222222-2222-2222-2222-222222222222');
    }

    public function test_throws_ai_disabled_when_kill_switch_is_off_without_calling_llm(): void
    {
        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with(self::PATIENT_ID)->andReturn($this->patient());

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldNotReceive('listForPatient');

        $flags = Mockery::mock(FeatureFlagRepository::class);
        $flags->shouldReceive('findByKeyAndBrand')->with('aiActionsEnabled', self::BRAND_ID)
            ->andReturn(new FeatureFlag(key: 'aiActionsEnabled', brandId: self::BRAND_ID, enabled: false));

        $aiActions = Mockery::mock(AiActionRepository::class);
        $aiActions->shouldNotReceive('insertMany');

        $llm = new FakeLlmClient;

        $service = new AiActionService($patients, $biomarkers, $flags, $aiActions, $llm);

        $this->expectException(AiDisabled::class);

        $service->generate(self::PATIENT_ID);

        $this->assertSame(0, $llm->timesCalled());
    }

    public function test_throws_patient_no_biomarkers_when_patient_has_none_without_calling_llm(): void
    {
        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with(self::PATIENT_ID)->andReturn($this->patient());

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('listForPatient')->with(self::PATIENT_ID)->andReturn([]);

        $flags = Mockery::mock(FeatureFlagRepository::class);
        $flags->shouldReceive('findByKeyAndBrand')->with('aiActionsEnabled', self::BRAND_ID)->andReturn($this->enabledFlag());

        $aiActions = Mockery::mock(AiActionRepository::class);
        $aiActions->shouldNotReceive('insertMany');

        $llm = new FakeLlmClient;

        $service = new AiActionService($patients, $biomarkers, $flags, $aiActions, $llm);

        $this->expectException(PatientNoBiomarkers::class);

        $service->generate(self::PATIENT_ID);

        $this->assertSame(0, $llm->timesCalled());
    }

    public function test_timeout_never_retries_and_raises_llm_unavailable(): void
    {
        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with(self::PATIENT_ID)->andReturn($this->patient());

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('listForPatient')->with(self::PATIENT_ID)->andReturn($this->biomarkers());

        $flags = Mockery::mock(FeatureFlagRepository::class);
        $flags->shouldReceive('findByKeyAndBrand')->with('aiActionsEnabled', self::BRAND_ID)->andReturn($this->enabledFlag());

        $aiActions = Mockery::mock(AiActionRepository::class);
        $aiActions->shouldReceive('findByPatientAndHash')->once()->andReturn([]);
        $aiActions->shouldNotReceive('insertMany');

        $llm = new FakeLlmClient;
        $llm->failWith(new LlmTimeout(15));

        $service = new AiActionService($patients, $biomarkers, $flags, $aiActions, $llm);

        try {
            $service->generate(self::PATIENT_ID);
            $this->fail('Expected LlmUnavailable to be thrown.');
        } catch (LlmUnavailable) {
            $this->assertSame(1, $llm->timesCalled());
        }
    }

    public function test_invalid_schema_twice_retries_once_then_raises_llm_unavailable(): void
    {
        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with(self::PATIENT_ID)->andReturn($this->patient());

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('listForPatient')->with(self::PATIENT_ID)->andReturn($this->biomarkers());

        $flags = Mockery::mock(FeatureFlagRepository::class);
        $flags->shouldReceive('findByKeyAndBrand')->with('aiActionsEnabled', self::BRAND_ID)->andReturn($this->enabledFlag());

        $aiActions = Mockery::mock(AiActionRepository::class);
        $aiActions->shouldReceive('findByPatientAndHash')->once()->andReturn([]);
        $aiActions->shouldNotReceive('insertMany');

        $llm = new FakeLlmClient;
        $llm->failWith(new LlmInvalidResponse('bad schema'));
        $llm->failWith(new LlmInvalidResponse('still bad'));

        $service = new AiActionService($patients, $biomarkers, $flags, $aiActions, $llm);

        try {
            $service->generate(self::PATIENT_ID);
            $this->fail('Expected LlmUnavailable to be thrown.');
        } catch (LlmUnavailable) {
            $this->assertSame(2, $llm->timesCalled());
        }
    }

    public function test_invalid_schema_once_then_success_retries_and_returns_generated_result(): void
    {
        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with(self::PATIENT_ID)->andReturn($this->patient());

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('listForPatient')->with(self::PATIENT_ID)->andReturn($this->biomarkers());

        $flags = Mockery::mock(FeatureFlagRepository::class);
        $flags->shouldReceive('findByKeyAndBrand')->with('aiActionsEnabled', self::BRAND_ID)->andReturn($this->enabledFlag());

        $aiActions = Mockery::mock(AiActionRepository::class);
        $aiActions->shouldReceive('findByPatientAndHash')->once()->andReturn([]);
        $aiActions->shouldReceive('insertMany')->once();

        $llm = new FakeLlmClient;
        $llm->failWith(new LlmInvalidResponse('bad schema'));
        $llm->respondWith($this->suggestion());

        $service = new AiActionService($patients, $biomarkers, $flags, $aiActions, $llm);

        $result = $service->generate(self::PATIENT_ID);

        $this->assertTrue($result->generated);
        $this->assertCount(1, $result->actions);
        $this->assertSame(2, $llm->timesCalled());
    }
}
