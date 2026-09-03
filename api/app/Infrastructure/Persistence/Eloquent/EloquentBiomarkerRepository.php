<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent;

use App\Domain\Biomarker\Biomarker;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Biomarker\BiomarkerStatus;
use App\Infrastructure\Persistence\Eloquent\Models\Biomarker as BiomarkerModel;

final class EloquentBiomarkerRepository implements BiomarkerRepository
{
    public function listForPatient(string $patientId): array
    {
        return BiomarkerModel::query()
            ->where('patient_id', $patientId)
            ->orderBy('measured_at', 'desc')
            ->get()
            ->map(fn (BiomarkerModel $model): Biomarker => new Biomarker(
                id: $model->id,
                patientId: $model->patient_id,
                code: $model->code,
                label: $model->label,
                value: $model->value,
                unit: $model->unit,
                refMin: $model->ref_min,
                refMax: $model->ref_max,
                measuredAt: $model->measured_at->toIso8601String(),
                status: BiomarkerStatus::from($model->value, $model->ref_min, $model->ref_max),
            ))
            ->all();
    }

    public function save(Biomarker $biomarker): void
    {
        BiomarkerModel::query()->create([
            'id' => $biomarker->id,
            'patient_id' => $biomarker->patientId,
            'code' => $biomarker->code,
            'label' => $biomarker->label,
            'value' => $biomarker->value,
            'unit' => $biomarker->unit,
            'ref_min' => $biomarker->refMin,
            'ref_max' => $biomarker->refMax,
            'measured_at' => $biomarker->measuredAt,
        ]);
    }
}
