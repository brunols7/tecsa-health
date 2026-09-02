<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\AiAction\AiActionRepository;
use App\Domain\AiAction\LlmClient;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Domain\Patient\PatientRepository;
use App\Infrastructure\Llm\AnthropicClient;
use App\Infrastructure\Llm\GeminiClient;
use App\Infrastructure\Persistence\Eloquent\EloquentAiActionRepository;
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
        $this->app->bind(AiActionRepository::class, EloquentAiActionRepository::class);
        $this->app->bind(LlmClient::class, function (): LlmClient {
            return filled(config('services.anthropic.key'))
                ? $this->app->make(AnthropicClient::class)
                : $this->app->make(GeminiClient::class);
        });
    }
}
