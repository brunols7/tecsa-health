<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent;

use App\Domain\AiAction\AiAction;
use App\Domain\AiAction\AiActionRepository;
use App\Domain\AiAction\AiActionStatus;
use App\Domain\AiAction\Exceptions\AiActionNotFound;
use App\Infrastructure\Persistence\Eloquent\Models\AiAction as AiActionModel;

final class EloquentAiActionRepository implements AiActionRepository
{
    public function findById(string $id): ?AiAction
    {
        $model = AiActionModel::query()->find($id);

        if ($model === null) {
            return null;
        }

        return $this->toDomain($model);
    }

    public function listForPatient(string $patientId): array
    {
        return AiActionModel::query()
            ->where('patient_id', $patientId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (AiActionModel $model): AiAction => $this->toDomain($model))
            ->all();
    }

    public function findByPatientAndHash(string $patientId, string $inputHash): array
    {
        return AiActionModel::query()
            ->where('patient_id', $patientId)
            ->where('input_hash', $inputHash)
            ->get()
            ->map(fn (AiActionModel $model): AiAction => $this->toDomain($model))
            ->all();
    }

    public function insertMany(array $actions): void
    {
        foreach ($actions as $action) {
            AiActionModel::query()->create([
                'id' => $action->id,
                'patient_id' => $action->patientId,
                'title' => $action->title,
                'rationale' => $action->rationale,
                'priority' => $action->priority,
                'biomarkers' => $action->biomarkers,
                'status' => $action->status->value(),
                'input_hash' => $action->inputHash,
                'created_at' => $action->createdAt,
            ]);
        }
    }

    public function updateStatus(string $id, AiActionStatus $status): AiAction
    {
        $affected = AiActionModel::query()
            ->where('id', $id)
            ->update(['status' => $status->value()]);

        if ($affected === 0) {
            throw new AiActionNotFound($id);
        }

        $model = AiActionModel::query()->findOrFail($id);

        return $this->toDomain($model);
    }

    private function toDomain(AiActionModel $model): AiAction
    {
        return new AiAction(
            id: $model->id,
            patientId: $model->patient_id,
            title: $model->title,
            rationale: $model->rationale,
            priority: $model->priority,
            biomarkers: $model->biomarkers,
            status: AiActionStatus::fromString($model->status),
            inputHash: $model->input_hash,
            createdAt: $model->created_at->toIso8601String(),
        );
    }
}
