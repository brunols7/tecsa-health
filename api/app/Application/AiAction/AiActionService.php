<?php

declare(strict_types=1);

namespace App\Application\AiAction;

use App\Domain\AiAction\AiAction;
use App\Domain\AiAction\AiActionRepository;
use App\Domain\AiAction\AiActionStatus;
use App\Domain\AiAction\AiPromptInput;
use App\Domain\AiAction\AiSuggestedAction;
use App\Domain\AiAction\AiSuggestion;
use App\Domain\AiAction\Exceptions\AiActionAlreadyResolved;
use App\Domain\AiAction\Exceptions\AiActionNotFound;
use App\Domain\AiAction\Exceptions\AiDisabled;
use App\Domain\AiAction\Exceptions\LlmInvalidResponse;
use App\Domain\AiAction\Exceptions\LlmTimeout;
use App\Domain\AiAction\Exceptions\LlmUnavailable;
use App\Domain\AiAction\Exceptions\PatientNoBiomarkers;
use App\Domain\AiAction\InputHashCalculator;
use App\Domain\AiAction\LlmClient;
use App\Domain\Biomarker\Biomarker;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Domain\Patient\Exceptions\PatientNotFound;
use App\Domain\Patient\Patient;
use App\Domain\Patient\PatientRepository;
use DateTimeImmutable;
use Ramsey\Uuid\Uuid;

final class AiActionService
{
    private const UUID_PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

    private const AI_ACTIONS_FLAG_KEY = 'aiActionsEnabled';

    public function __construct(
        private readonly PatientRepository $patients,
        private readonly BiomarkerRepository $biomarkers,
        private readonly FeatureFlagRepository $featureFlags,
        private readonly AiActionRepository $aiActions,
        private readonly LlmClient $llm,
    ) {}

    public function generate(string $patientId): AiActionGenerationResult
    {
        $this->assertValidPatientId($patientId);

        $patient = $this->patients->findById($patientId);

        if ($patient === null) {
            throw new PatientNotFound($patientId);
        }

        $this->assertAiEnabled($patient->brandId);

        $biomarkers = $this->biomarkers->listForPatient($patientId);

        if ($biomarkers === []) {
            throw new PatientNoBiomarkers($patientId);
        }

        $inputHash = InputHashCalculator::compute(
            array_map(static fn (Biomarker $biomarker): array => [
                'code' => $biomarker->code,
                'value' => $biomarker->value,
                'unit' => $biomarker->unit,
                'measuredAt' => $biomarker->measuredAt,
            ], $biomarkers),
            $patient->goal,
        );

        $existing = $this->aiActions->findByPatientAndHash($patientId, $inputHash);

        if ($existing !== []) {
            return new AiActionGenerationResult(actions: $existing, generated: false);
        }

        $promptInput = new AiPromptInput(
            age: $this->ageFromBirthDate($patient->birthDate),
            goal: $patient->goal,
            biomarkers: array_map(static fn (Biomarker $biomarker): array => [
                'code' => $biomarker->code,
                'value' => $biomarker->value,
                'unit' => $biomarker->unit,
                'refMin' => $biomarker->refMin,
                'refMax' => $biomarker->refMax,
            ], $biomarkers),
        );

        $suggestion = $this->generateWithRetry($promptInput);

        $createdAt = (new DateTimeImmutable)->format(DATE_ATOM);

        $actions = array_map(
            static fn (AiSuggestedAction $suggested): AiAction => new AiAction(
                id: Uuid::uuid4()->toString(),
                patientId: $patientId,
                title: $suggested->title,
                rationale: $suggested->rationale,
                priority: $suggested->priority,
                biomarkers: $suggested->biomarkers,
                status: AiActionStatus::Pending,
                inputHash: $inputHash,
                createdAt: $createdAt,
            ),
            $suggestion->actions,
        );

        $this->aiActions->insertMany($actions);

        return new AiActionGenerationResult(actions: $actions, generated: true);
    }

    /**
     * @return array<int, AiAction>
     */
    public function listForPatient(string $patientId): array
    {
        $this->assertValidPatientId($patientId);

        $patient = $this->patients->findById($patientId);

        if ($patient === null) {
            throw new PatientNotFound($patientId);
        }

        $this->assertAiEnabled($patient->brandId);

        return $this->aiActions->listForPatient($patientId);
    }

    public function decide(string $actionId, AiActionStatus $targetStatus): AiAction
    {
        $this->assertValidActionId($actionId);

        $action = $this->aiActions->findById($actionId);

        if ($action === null) {
            throw new AiActionNotFound($actionId);
        }

        $patient = $this->patients->findById($action->patientId);

        if ($patient === null) {
            throw new PatientNotFound($action->patientId);
        }

        $this->assertAiEnabled($patient->brandId);

        if (! $action->status->canTransitionTo($targetStatus)) {
            throw new AiActionAlreadyResolved($actionId);
        }

        return $this->aiActions->updateStatus($actionId, $targetStatus);
    }

    private function generateWithRetry(AiPromptInput $promptInput): AiSuggestion
    {
        try {
            return $this->llm->generate($promptInput);
        } catch (LlmTimeout $exception) {
            throw new LlmUnavailable($exception->getMessage());
        } catch (LlmInvalidResponse) {
            try {
                return $this->llm->generate($promptInput);
            } catch (LlmTimeout $retryException) {
                throw new LlmUnavailable($retryException->getMessage());
            } catch (LlmInvalidResponse $retryException) {
                throw new LlmUnavailable($retryException->getMessage());
            }
        }
    }

    private function assertAiEnabled(string $brandId): void
    {
        $flag = $this->featureFlags->findByKeyAndBrand(self::AI_ACTIONS_FLAG_KEY, $brandId);

        if ($flag === null || ! $flag->enabled) {
            throw new AiDisabled($brandId);
        }
    }

    private function ageFromBirthDate(string $birthDate): int
    {
        $birth = new DateTimeImmutable($birthDate);
        $now = new DateTimeImmutable;

        return (int) $birth->diff($now)->y;
    }

    private function assertValidPatientId(string $id): void
    {
        if (preg_match(self::UUID_PATTERN, $id) !== 1) {
            throw new PatientNotFound($id);
        }
    }

    private function assertValidActionId(string $id): void
    {
        if (preg_match(self::UUID_PATTERN, $id) !== 1) {
            throw new AiActionNotFound($id);
        }
    }
}
