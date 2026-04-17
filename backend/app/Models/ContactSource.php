<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactSource extends Model
{
    protected $fillable = ['name', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];
}
