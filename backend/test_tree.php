<?php
$users = [
    ['id' => 1, 'name' => 'Root', 'direct_manager_id' => null, 'target_revenue' => 100],
    ['id' => 2, 'name' => 'Child', 'direct_manager_id' => 1, 'target_revenue' => 10],
    ['id' => 3, 'name' => 'Grandchild', 'direct_manager_id' => "2", 'target_revenue' => 5],
];

$activeIds = array_column($users, 'id');
$rootUsers = array_filter($users, function($u) use ($activeIds) {
    return is_null($u['direct_manager_id']) || !in_array($u['direct_manager_id'], $activeIds);
});

function buildBranch($users, $managerId) {
    $branch = [];
    $children = array_filter($users, function ($u) use ($managerId) {
        return $u['direct_manager_id'] == $managerId;
    });
    foreach ($children as $c) {
        $c['reports'] = buildBranch($users, $c['id']);
        $branch[] = $c;
    }
    return $branch;
}

$tree = [];
foreach ($rootUsers as $root) {
    $root['reports'] = buildBranch($users, $root['id']);
    $tree[] = $root;
}
echo json_encode($tree, JSON_PRETTY_PRINT);
