<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Application\Patient\PatientService;
use App\Domain\Biomarker\Biomarker;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Biomarker\BiomarkerStatus;
use App\Domain\Brand\Brand;
use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\Patient\Exceptions\InvalidCursor;
use App\Domain\Patient\Exceptions\InvalidStatusTransition;
use App\Domain\Patient\Exceptions\PatientNotFound;
use App\Domain\Patient\Patient;
use App\Domain\Patient\PatientCursor;
use App\Domain\Patient\PatientPage;
use App\Domain\Patient\PatientRepository;
use Mockery;
use Tests\TestCase;

class PatientServiceTest extends TestCase
{
    public function test_lists_patients_for_a_known_brand_slug_with_default_limit(): void
    {
        $brand = new Brand(id: 'brand-1', slug: 'nutri-care');
        $page = new PatientPage(items: [], nextCursor: null);

        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('nutri-care')->andReturn($brand);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('paginate')->with('brand-1', null, null, 50)->andReturn($page);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->listForBrandSlug('nutri-care', null, null, null);

        $this->assertSame($page, $result);
    }

    public function test_clamps_limit_above_100_to_100(): void
    {
        $brand = new Brand(id: 'brand-1', slug: 'nutri-care');
        $page = new PatientPage(items: [], nextCursor: null);

        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('nutri-care')->andReturn($brand);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('paginate')->with('brand-1', null, null, 100)->andReturn($page);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->listForBrandSlug('nutri-care', null, null, 250);

        $this->assertSame($page, $result);
    }

    public function test_throws_brand_not_found_when_slug_does_not_resolve(): void
    {
        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('unknown')->andReturn(null);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldNotReceive('paginate');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(BrandNotFound::class);

        $service->listForBrandSlug('unknown', null, null, null);
    }

    public function test_decodes_a_valid_cursor_and_delegates_the_decoded_value_to_the_repository(): void
    {
        $brand = new Brand(id: 'brand-1', slug: 'nutri-care');
        $page = new PatientPage(items: [], nextCursor: null);
        $rawCursor = PatientCursor::encode('Ana', 'patient-1');

        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('nutri-care')->andReturn($brand);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('paginate')
            ->with('brand-1', null, Mockery::on(function (PatientCursor $cursor) {
                return $cursor->name === 'Ana' && $cursor->id === 'patient-1';
            }), 50)
            ->andReturn($page);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->listForBrandSlug('nutri-care', null, $rawCursor, null);

        $this->assertSame($page, $result);
    }

    public function test_throws_invalid_cursor_when_raw_cursor_is_malformed(): void
    {
        $brand = new Brand(id: 'brand-1', slug: 'nutri-care');

        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('nutri-care')->andReturn($brand);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldNotReceive('paginate');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(InvalidCursor::class);

        $service->listForBrandSlug('nutri-care', null, 'not-valid-base64-json', null);
    }

    public function test_create_resolves_brand_and_inserts_patient(): void
    {
        $brand = new Brand(id: 'brand-1', slug: 'nutri-care');
        $created = new Patient(
            id: '11111111-1111-1111-1111-111111111111',
            brandId: 'brand-1',
            name: 'Ana Silva',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: 'active',
            needsFollowUp: false,
            statusChangedAt: '2026-01-01T00:00:00+00:00',
            updatedAt: '2026-01-01T00:00:00+00:00',
        );

        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('nutri-care')->andReturn($brand);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('insert')->with('brand-1', 'Ana Silva', '1990-01-01', 'lose_weight')->andReturn($created);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->create('Ana Silva', '1990-01-01', 'lose_weight', 'nutri-care');

        $this->assertSame($created, $result);
    }

    public function test_create_throws_brand_not_found_when_slug_does_not_resolve(): void
    {
        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('unknown')->andReturn(null);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldNotReceive('insert');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(BrandNotFound::class);

        $service->create('Ana Silva', '1990-01-01', 'lose_weight', 'unknown');
    }

    public function test_update_delegates_only_the_given_fields_to_the_repository(): void
    {
        $updated = new Patient(
            id: '11111111-1111-1111-1111-111111111111',
            brandId: 'brand-1',
            name: 'Updated Name',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: 'active',
            needsFollowUp: false,
            statusChangedAt: '2026-01-01T00:00:00+00:00',
            updatedAt: '2026-01-02T00:00:00+00:00',
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('update')
            ->with('11111111-1111-1111-1111-111111111111', ['name' => 'Updated Name'])
            ->andReturn($updated);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->update('11111111-1111-1111-1111-111111111111', ['name' => 'Updated Name']);

        $this->assertSame($updated, $result);
    }

    public function test_update_throws_patient_not_found_when_repository_reports_no_patient(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('update')
            ->with('22222222-2222-2222-2222-222222222222', ['name' => 'X'])
            ->andThrow(new PatientNotFound('22222222-2222-2222-2222-222222222222'));

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->update('22222222-2222-2222-2222-222222222222', ['name' => 'X']);
    }

    public function test_update_throws_patient_not_found_when_id_is_not_a_well_formed_uuid(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldNotReceive('update');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->update('not-a-uuid', ['name' => 'X']);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function validTransitions(): array
    {
        return [
            'active to inactive' => ['active', 'inactive'],
            'active to completed' => ['active', 'completed'],
            'inactive to active' => ['inactive', 'active'],
            'completed to active' => ['completed', 'active'],
        ];
    }

    /**
     * @dataProvider validTransitions
     */
    public function test_change_status_applies_each_valid_transition(string $from, string $to): void
    {
        $current = new Patient(
            id: '11111111-1111-1111-1111-111111111111',
            brandId: 'brand-1',
            name: 'Ana Silva',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: $from,
            needsFollowUp: false,
            updatedAt: '2026-01-01T00:00:00+00:00',
        );

        $updated = new Patient(
            id: '11111111-1111-1111-1111-111111111111',
            brandId: 'brand-1',
            name: 'Ana Silva',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: $to,
            needsFollowUp: false,
            statusChangedAt: '2026-02-01T00:00:00+00:00',
            updatedAt: '2026-02-01T00:00:00+00:00',
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('11111111-1111-1111-1111-111111111111')->andReturn($current);
        $patients->shouldReceive('updateStatus')
            ->with('11111111-1111-1111-1111-111111111111', $to, Mockery::type('string'))
            ->andReturn($updated);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->changeStatus('11111111-1111-1111-1111-111111111111', $to);

        $this->assertSame($updated, $result);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function invalidTransitions(): array
    {
        return [
            'inactive to completed' => ['inactive', 'completed'],
            'completed to inactive' => ['completed', 'inactive'],
            'active to active' => ['active', 'active'],
        ];
    }

    /**
     * @dataProvider invalidTransitions
     */
    public function test_change_status_rejects_each_invalid_transition(string $from, string $to): void
    {
        $current = new Patient(
            id: '11111111-1111-1111-1111-111111111111',
            brandId: 'brand-1',
            name: 'Ana Silva',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: $from,
            needsFollowUp: false,
            updatedAt: '2026-01-01T00:00:00+00:00',
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('11111111-1111-1111-1111-111111111111')->andReturn($current);
        $patients->shouldNotReceive('updateStatus');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(InvalidStatusTransition::class);

        $service->changeStatus('11111111-1111-1111-1111-111111111111', $to);
    }

    public function test_change_status_throws_patient_not_found_when_patient_does_not_exist(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('22222222-2222-2222-2222-222222222222')->andReturn(null);
        $patients->shouldNotReceive('updateStatus');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->changeStatus('22222222-2222-2222-2222-222222222222', 'inactive');
    }

    public function test_change_status_throws_patient_not_found_when_id_is_not_a_well_formed_uuid(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldNotReceive('findById');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->changeStatus('not-a-uuid', 'inactive');
    }

    public function test_get_by_id_returns_the_patient_when_it_exists(): void
    {
        $patient = new Patient(
            id: '11111111-1111-1111-1111-111111111111',
            brandId: 'brand-1',
            name: 'Ana Silva',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: 'active',
            needsFollowUp: false,
            updatedAt: '2026-01-01T00:00:00+00:00',
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('11111111-1111-1111-1111-111111111111')->andReturn($patient);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->getById('11111111-1111-1111-1111-111111111111');

        $this->assertSame($patient, $result);
    }

    public function test_get_by_id_throws_patient_not_found_when_it_does_not_exist(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('22222222-2222-2222-2222-222222222222')->andReturn(null);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->getById('22222222-2222-2222-2222-222222222222');
    }

    public function test_get_by_id_throws_patient_not_found_when_id_is_not_a_well_formed_uuid(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldNotReceive('findById');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->getById('not-a-uuid');
    }

    public function test_list_biomarkers_returns_the_repository_result_when_patient_exists(): void
    {
        $patient = new Patient(
            id: '11111111-1111-1111-1111-111111111111',
            brandId: 'brand-1',
            name: 'Ana Silva',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: 'active',
            needsFollowUp: false,
            updatedAt: '2026-01-01T00:00:00+00:00',
        );

        $biomarker = new Biomarker(
            id: 'bio-1',
            patientId: '11111111-1111-1111-1111-111111111111',
            code: 'glucose',
            label: 'Glicose',
            value: 90.0,
            unit: 'mg/dL',
            refMin: 70.0,
            refMax: 100.0,
            measuredAt: '2026-01-01T00:00:00+00:00',
            status: BiomarkerStatus::Normal,
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('11111111-1111-1111-1111-111111111111')->andReturn($patient);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('listForPatient')->with('11111111-1111-1111-1111-111111111111')->andReturn([$biomarker]);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->listBiomarkers('11111111-1111-1111-1111-111111111111');

        $this->assertSame([$biomarker], $result);
    }

    public function test_list_biomarkers_throws_patient_not_found_before_querying_biomarkers(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('22222222-2222-2222-2222-222222222222')->andReturn(null);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldNotReceive('listForPatient');

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->listBiomarkers('22222222-2222-2222-2222-222222222222');
    }

    public function test_list_biomarkers_throws_patient_not_found_when_id_is_not_a_well_formed_uuid(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldNotReceive('findById');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldNotReceive('listForPatient');

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->listBiomarkers('not-a-uuid');
    }

    public function test_set_needs_follow_up_delegates_to_the_repository_and_returns_updated_patient(): void
    {
        $updated = new Patient(
            id: '11111111-1111-1111-1111-111111111111',
            brandId: 'brand-1',
            name: 'Ana Silva',
            birthDate: '1990-01-01',
            goal: 'lose_weight',
            status: 'active',
            needsFollowUp: true,
            updatedAt: '2026-01-01T00:00:00+00:00',
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('updateNeedsFollowUp')->with('11111111-1111-1111-1111-111111111111', true)->andReturn($updated);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->setNeedsFollowUp('11111111-1111-1111-1111-111111111111', true);

        $this->assertSame($updated, $result);
    }

    public function test_set_needs_follow_up_propagates_patient_not_found_from_the_repository(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('updateNeedsFollowUp')->with('22222222-2222-2222-2222-222222222222', true)->andThrow(new PatientNotFound('22222222-2222-2222-2222-222222222222'));

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->setNeedsFollowUp('22222222-2222-2222-2222-222222222222', true);
    }

    public function test_set_needs_follow_up_throws_patient_not_found_when_id_is_not_a_well_formed_uuid(): void
    {
        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldNotReceive('updateNeedsFollowUp');

        $biomarkers = Mockery::mock(BiomarkerRepository::class);

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->setNeedsFollowUp('not-a-uuid', true);
    }
}
