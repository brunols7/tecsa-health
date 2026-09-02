<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Domain\Patient\PatientRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentBiomarkerRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentBrandRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentFeatureFlagRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentPatientRepository;
use Illuminate\Support\ServiceProvider;

final class DomainServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(FeatureFlagRepository::class, EloquentFeatureFlagRepository::class);
        $this->app->bind(BrandRepository::class, EloquentBrandRepository::class);
        $this->app->bind(PatientRepository::class, EloquentPatientRepository::class);
        $this->app->bind(BiomarkerRepository::class, EloquentBiomarkerRepository::class);
    }
}
