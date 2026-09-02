<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\AiAction\LlmClient;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Domain\Patient\PatientRepository;
use App\Infrastructure\Llm\AnthropicClient;
use App\Infrastructure\Llm\GeminiClient;
use App\Infrastructure\Persistence\Eloquent\EloquentBiomarkerRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentBrandRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentFeatureFlagRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentPatientRepository;
use Tests\TestCase;

class DomainServiceProviderTest extends TestCase
{
    public function test_feature_flag_repository_resolves_to_eloquent_implementation(): void
    {
        $resolved = $this->app->make(FeatureFlagRepository::class);

        $this->assertInstanceOf(EloquentFeatureFlagRepository::class, $resolved);
    }

    public function test_brand_repository_resolves_to_eloquent_implementation(): void
    {
        $resolved = $this->app->make(BrandRepository::class);

        $this->assertInstanceOf(EloquentBrandRepository::class, $resolved);
    }

    public function test_patient_repository_resolves_to_eloquent_implementation(): void
    {
        $resolved = $this->app->make(PatientRepository::class);

        $this->assertInstanceOf(EloquentPatientRepository::class, $resolved);
    }

    public function test_biomarker_repository_resolves_to_eloquent_implementation(): void
    {
        $resolved = $this->app->make(BiomarkerRepository::class);

        $this->assertInstanceOf(EloquentBiomarkerRepository::class, $resolved);
    }

    public function test_llm_client_resolves_to_anthropic_when_anthropic_key_is_filled(): void
    {
        config(['services.anthropic.key' => 'sk-ant-x']);

        $resolved = $this->app->make(LlmClient::class);

        $this->assertInstanceOf(AnthropicClient::class, $resolved);
    }

    public function test_llm_client_resolves_to_gemini_when_anthropic_key_is_empty(): void
    {
        config(['services.anthropic.key' => '']);

        $resolved = $this->app->make(LlmClient::class);

        $this->assertInstanceOf(GeminiClient::class, $resolved);
    }

    public function test_llm_client_resolves_to_gemini_when_anthropic_key_is_null(): void
    {
        config(['services.anthropic.key' => null]);

        $resolved = $this->app->make(LlmClient::class);

        $this->assertInstanceOf(GeminiClient::class, $resolved);
    }

    public function test_llm_client_resolves_to_gemini_when_anthropic_key_is_only_whitespace(): void
    {
        config(['services.anthropic.key' => '   ']);

        $resolved = $this->app->make(LlmClient::class);

        $this->assertInstanceOf(GeminiClient::class, $resolved);
    }

    public function test_llm_client_binding_is_reevaluated_on_each_resolution(): void
    {
        config(['services.anthropic.key' => 'sk-ant-x']);
        $anthropicResolution = $this->app->make(LlmClient::class);

        config(['services.anthropic.key' => '']);
        $geminiResolution = $this->app->make(LlmClient::class);

        $this->assertInstanceOf(AnthropicClient::class, $anthropicResolution);
        $this->assertInstanceOf(GeminiClient::class, $geminiResolution);
    }
}
