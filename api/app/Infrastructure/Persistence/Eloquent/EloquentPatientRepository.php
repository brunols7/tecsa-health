<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent;

use App\Domain\Patient\Exceptions\PatientNotFound;
use App\Domain\Patient\Patient;
use App\Domain\Patient\PatientCursor;
use App\Domain\Patient\PatientPage;
use App\Domain\Patient\PatientRepository;
use App\Domain\Patient\PatientStatus;
use App\Infrastructure\Persistence\Eloquent\Models\Patient as PatientModel;
use Illuminate\Support\Carbon;

final class EloquentPatientRepository implements PatientRepository
{
    public function paginate(
        string $brandId,
        ?string $search,
        ?PatientCursor $cursor,
        int $limit,
        array $statuses = ['active'],
    ): PatientPage {
        $query = PatientModel::query()
            ->where('brand_id', $brandId)
            ->whereIn('status', $statuses);

        if ($search !== null && $search !== '') {
            $query->where('name', 'ilike', "%{$search}%");
        }

        if ($cursor !== null) {
            $query->whereRaw('(name, id) > (?, ?)', [$cursor->name, $cursor->id]);
        }

        $rows = $query
            ->orderBy('name')
            ->orderBy('id')
            ->limit($limit + 1)
            ->get();

        $hasNextPage = $rows->count() > $limit;
        $items = $hasNextPage ? $rows->slice(0, $limit) : $rows;

        $nextCursor = null;

        if ($hasNextPage) {
            $last = $items->last();
            $nextCursor = PatientCursor::encode($last->name, $last->id);
        }

        return new PatientPage(
            items: $items->map(fn (PatientModel $model): Patient => $this->toDomain($model))->all(),
            nextCursor: $nextCursor,
        );
    }

    public function findById(string $id): ?Patient
    {
        $model = PatientModel::query()->find($id);

        if ($model === null) {
            return null;
        }

        return $this->toDomain($model);
    }

    public function updateNeedsFollowUp(string $id, bool $needsFollowUp): Patient
    {
        $affected = PatientModel::query()
            ->where('id', $id)
            ->update(['needs_follow_up' => $needsFollowUp]);

        if ($affected === 0) {
            throw new PatientNotFound($id);
        }

        $model = PatientModel::query()->findOrFail($id);

        return $this->toDomain($model);
    }

    public function insert(string $brandId, string $name, string $birthDate, string $goal): Patient
    {
        $now = Carbon::now();

        $model = PatientModel::query()->create([
            'brand_id' => $brandId,
            'name' => $name,
            'birth_date' => $birthDate,
            'goal' => $goal,
            'status' => PatientStatus::Active->value,
            'needs_follow_up' => false,
            'status_changed_at' => $now,
            'updated_at' => $now,
        ]);

        return $this->toDomain($model);
    }

    public function update(string $id, array $fields): Patient
    {
        $columns = $this->mapFieldsToColumns($fields);
        $columns['updated_at'] = Carbon::now();

        $affected = PatientModel::query()
            ->where('id', $id)
            ->update($columns);

        if ($affected === 0) {
            throw new PatientNotFound($id);
        }

        $model = PatientModel::query()->findOrFail($id);

        return $this->toDomain($model);
    }

    public function updateStatus(string $id, string $status, string $statusChangedAt): Patient
    {
        $affected = PatientModel::query()
            ->where('id', $id)
            ->update([
                'status' => $status,
                'status_changed_at' => $statusChangedAt,
            ]);

        if ($affected === 0) {
            throw new PatientNotFound($id);
        }

        $model = PatientModel::query()->findOrFail($id);

        return $this->toDomain($model);
    }

    public function delete(string $id): void
    {
        $affected = PatientModel::query()
            ->where('id', $id)
            ->delete();

        if ($affected === 0) {
            throw new PatientNotFound($id);
        }
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    private function mapFieldsToColumns(array $fields): array
    {
        $map = [
            'name' => 'name',
            'birthDate' => 'birth_date',
            'goal' => 'goal',
            'needsFollowUp' => 'needs_follow_up',
        ];

        $columns = [];

        foreach ($fields as $key => $value) {
            if (array_key_exists($key, $map)) {
                $columns[$map[$key]] = $value;
            }
        }

        return $columns;
    }

    private function toDomain(PatientModel $model): Patient
    {
        return new Patient(
            id: $model->id,
            brandId: $model->brand_id,
            name: $model->name,
            birthDate: $model->birth_date->format('Y-m-d'),
            goal: $model->goal,
            status: $model->status,
            needsFollowUp: $model->needs_follow_up,
            statusChangedAt: $model->status_changed_at?->toIso8601String() ?? '',
            updatedAt: $model->updated_at->toIso8601String(),
        );
    }
}
