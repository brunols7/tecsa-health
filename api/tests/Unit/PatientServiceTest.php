<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Application\Patient\PatientService;
use App\Domain\Biomarker\Biomarker;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Biomarker\BiomarkerStatus;
use App\Domain\Biomarker\CreateBiomarkerData;
use App\Domain\Brand\Brand;
use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\Patient\Exceptions\InvalidCursor;
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

    public function test_create_biomarker_generates_id_code_and_status_then_saves_once(): void
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

        $data = new CreateBiomarkerData(
            label: 'Ferro sérico',
            value: 40.0,
            unit: 'ng/mL',
            refMin: 20.0,
            refMax: 200.0,
            measuredAt: '2026-01-15',
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('11111111-1111-1111-1111-111111111111')->andReturn($patient);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('save')
            ->once()
            ->with(Mockery::on(function (Biomarker $biomarker) {
                return $biomarker->patientId === '11111111-1111-1111-1111-111111111111'
                    && $biomarker->code === 'ferro_serico'
                    && $biomarker->label === 'Ferro sérico'
                    && $biomarker->value === 40.0
                    && $biomarker->unit === 'ng/mL'
                    && $biomarker->refMin === 20.0
                    && $biomarker->refMax === 200.0
                    && $biomarker->measuredAt === '2026-01-15'
                    && $biomarker->status === BiomarkerStatus::Normal
                    && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $biomarker->id) === 1;
            }));

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->createBiomarker('11111111-1111-1111-1111-111111111111', $data);

        $this->assertSame('ferro_serico', $result->code);
        $this->assertSame(BiomarkerStatus::Normal, $result->status);
    }

    public function test_create_biomarker_derives_status_from_value_never_from_client_input(): void
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

        $data = new CreateBiomarkerData(
            label: 'TSH',
            value: 250.0,
            unit: 'mIU/L',
            refMin: 20.0,
            refMax: 200.0,
            measuredAt: '2026-01-15',
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('11111111-1111-1111-1111-111111111111')->andReturn($patient);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldReceive('save')->once();

        $service = new PatientService($brands, $patients, $biomarkers);

        $result = $service->createBiomarker('11111111-1111-1111-1111-111111111111', $data);

        $this->assertSame(BiomarkerStatus::High, $result->status);
    }

    public function test_create_biomarker_throws_patient_not_found_before_saving(): void
    {
        $data = new CreateBiomarkerData(
            label: 'TSH',
            value: 2.0,
            unit: 'mIU/L',
            refMin: 0.4,
            refMax: 4.0,
            measuredAt: '2026-01-15',
        );

        $brands = Mockery::mock(BrandRepository::class);

        $patients = Mockery::mock(PatientRepository::class);
        $patients->shouldReceive('findById')->with('22222222-2222-2222-2222-222222222222')->andReturn(null);

        $biomarkers = Mockery::mock(BiomarkerRepository::class);
        $biomarkers->shouldNotReceive('save');

        $service = new PatientService($brands, $patients, $biomarkers);

        $this->expectException(PatientNotFound::class);

        $service->createBiomarker('22222222-2222-2222-2222-222222222222', $data);
    }
}
