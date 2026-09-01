<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Infrastructure\Persistence\Eloquent\Models\Biomarker;
use App\Infrastructure\Persistence\Eloquent\Models\Patient;
use Database\Seeders\BrandSeeder;
use Database\Seeders\PatientSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PatientSeederTest extends TestCase
{
    use RefreshDatabase;

    private const SEED_COUNT = 20;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BrandSeeder::class);
    }

    public function test_distributes_patients_between_the_two_brands(): void
    {
        (new PatientSeeder)->run(self::SEED_COUNT);

        $counts = Patient::query()
            ->join('brands', 'brands.id', '=', 'patients.brand_id')
            ->selectRaw('brands.slug, count(*) as total')
            ->groupBy('brands.slug')
            ->pluck('total', 'slug');

        $this->assertCount(2, $counts);
        $this->assertSame(self::SEED_COUNT, (int) $counts->sum());
        $this->assertGreaterThan(0, (int) $counts['nutri-care']);
        $this->assertGreaterThan(0, (int) $counts['vita-plus']);
    }

    public function test_is_deterministic_across_two_runs_from_a_clean_database(): void
    {
        (new PatientSeeder)->run(self::SEED_COUNT);

        $firstPatientCount = Patient::query()->count();
        $firstBiomarkerCount = Biomarker::query()->count();

        DB::table('biomarkers')->delete();
        DB::table('patients')->delete();

        (new PatientSeeder)->run(self::SEED_COUNT);

        $secondPatientCount = Patient::query()->count();
        $secondBiomarkerCount = Biomarker::query()->count();

        $this->assertSame($firstPatientCount, $secondPatientCount);
        $this->assertSame($firstBiomarkerCount, $secondBiomarkerCount);
    }

    public function test_generates_at_least_one_biomarker_out_of_its_reference_range(): void
    {
        (new PatientSeeder)->run(self::SEED_COUNT);

        $outOfRange = Biomarker::query()
            ->whereColumn('value', '<', 'ref_min')
            ->orWhereColumn('value', '>', 'ref_max')
            ->exists();

        $this->assertTrue($outOfRange, 'Expected at least one biomarker outside [ref_min, ref_max].');
    }
}
