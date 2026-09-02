<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Patient\Exceptions\InvalidCursor;
use App\Domain\Patient\PatientCursor;
use PHPUnit\Framework\TestCase;

class PatientCursorTest extends TestCase
{
    public function test_round_trips_name_and_id_through_encode_and_decode(): void
    {
        $encoded = PatientCursor::encode('Ana Silva', 'patient-uuid-1');

        $cursor = PatientCursor::decode($encoded);

        $this->assertSame('Ana Silva', $cursor->name);
        $this->assertSame('patient-uuid-1', $cursor->id);
    }

    public function test_decode_throws_invalid_cursor_for_malformed_base64(): void
    {
        $this->expectException(InvalidCursor::class);

        PatientCursor::decode('%%%not-base64%%%');
    }

    public function test_decode_throws_invalid_cursor_for_valid_base64_but_invalid_json(): void
    {
        $this->expectException(InvalidCursor::class);

        PatientCursor::decode(base64_encode('not json'));
    }

    public function test_decode_throws_invalid_cursor_when_shape_is_missing_required_keys(): void
    {
        $this->expectException(InvalidCursor::class);

        PatientCursor::decode(base64_encode(json_encode(['name' => 'Ana Silva'])));
    }
}
