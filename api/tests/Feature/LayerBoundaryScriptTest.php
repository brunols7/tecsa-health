<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class LayerBoundaryScriptTest extends TestCase
{
    private string $scriptPath;

    private string $fixtureBase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->scriptPath = base_path('scripts/check-layer-boundary.sh');
        $this->fixtureBase = sys_get_temp_dir().'/layer-boundary-fixture-'.uniqid();

        mkdir($this->fixtureBase.'/Domain', 0777, true);
        mkdir($this->fixtureBase.'/Application', 0777, true);
        mkdir($this->fixtureBase.'/Http/Controllers', 0777, true);
    }

    protected function tearDown(): void
    {
        $this->removeDirectory($this->fixtureBase);

        parent::tearDown();
    }

    public function test_fails_when_domain_imports_illuminate(): void
    {
        $this->assertScriptExitCode(0);

        $violationFile = $this->fixtureBase.'/Domain/Bad.php';
        file_put_contents($violationFile, "<?php\n\nuse Illuminate\\Support\\Str;\n");

        $this->assertScriptExitCode(1);

        unlink($violationFile);

        $this->assertScriptExitCode(0);
    }

    public function test_fails_when_application_uses_db_facade_or_eloquent_models(): void
    {
        $this->assertScriptExitCode(0);

        $violationFile = $this->fixtureBase.'/Application/Bad.php';
        file_put_contents($violationFile, "<?php\n\nDB::table('patients')->get();\n");

        $this->assertScriptExitCode(1);

        unlink($violationFile);

        $this->assertScriptExitCode(0);
    }

    public function test_fails_when_controller_uses_db_facade_or_eloquent_models(): void
    {
        $this->assertScriptExitCode(0);

        $violationFile = $this->fixtureBase.'/Http/Controllers/Bad.php';
        file_put_contents($violationFile, "<?php\n\nDB::table('patients')->get();\n");

        $this->assertScriptExitCode(1);

        unlink($violationFile);

        $this->assertScriptExitCode(0);
    }

    public function test_fails_when_controller_uses_request_all(): void
    {
        $this->assertScriptExitCode(0);

        $violationFile = $this->fixtureBase.'/Http/Controllers/Bad.php';
        file_put_contents($violationFile, "<?php\n\n\$data = \$request->all();\n");

        $this->assertScriptExitCode(1);

        unlink($violationFile);

        $this->assertScriptExitCode(0);
    }

    private function assertScriptExitCode(int $expected): void
    {
        $command = sprintf(
            'bash %s %s',
            escapeshellarg($this->scriptPath),
            escapeshellarg($this->fixtureBase)
        );

        exec($command, $output, $exitCode);

        $this->assertSame($expected, $exitCode, implode("\n", $output));
    }

    private function removeDirectory(string $path): void
    {
        if (! is_dir($path)) {
            return;
        }

        foreach (scandir($path) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $itemPath = $path.'/'.$item;
            is_dir($itemPath) ? $this->removeDirectory($itemPath) : unlink($itemPath);
        }

        rmdir($path);
    }
}
