
import { createClient } from '@supabase/supabase-js';

// Using the key found in scripts/reset_manager_password.js
const supabaseUrl = 'https://tcusupabase2.zeabur.app';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TEST_ACCOUNTS = [
    {
        email: 'shop@test.com',
        password: 'test1234',
        role: 'shop_owner',
        shop_name: 'Test Bike Shop',
        athlete_id: 999001
    },
    {
        email: 'coach@test.com',
        password: 'test1234',
        role: 'team_coach',
        shop_name: 'Test Team',
        athlete_id: 999002
    },
    {
        email: 'power@test.com',
        password: 'test1234',
        role: 'power_coach',
        shop_name: 'Power Training Lab',
        athlete_id: 999003
    }
];

async function setupTestManagers() {
    console.log('🚀 開始建立測試帳號...\n');

    for (const acc of TEST_ACCOUNTS) {
        try {
            console.log(`正在處理: ${acc.email} (${acc.role})...`);

            // 1. Create or Get User (Auth)
            let userId;
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existingUser = users.find(u => u.email === acc.email);

            if (existingUser) {
                console.log(`  - 使用者已存在: ${existingUser.id}`);
                userId = existingUser.id;
                // Update password to be sure
                await supabase.auth.admin.updateUserById(userId, {
                    password: acc.password,
                    email_confirm: true
                });
            } else {
                console.log(`  - 建立新使用者...`);
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: acc.email,
                    password: acc.password,
                    email_confirm: true,
                    user_metadata: {
                        name: acc.shop_name
                    }
                });
                if (createError) throw createError;
                userId = newUser.user.id;
                console.log(`  - 使用者建立成功: ${userId}`);
            }

            // 2. Upsert Manager Role
            console.log(`  - 設定管理者角色...`);

            // Check if role exists by id or email
            const { data: existingRole, error: roleFetchError } = await supabase
                .from('manager_roles')
                .select('id')
                .eq('email', acc.email)
                .maybeSingle();

            if (roleFetchError) console.warn('  - 查詢角色錯誤 (可忽略):', roleFetchError.message);

            const roleData = {
                email: acc.email,
                role: acc.role,
                shop_name: acc.shop_name,
                athlete_id: acc.athlete_id, // Fake ID
                is_active: true,
                updated_at: new Date().toISOString()
            };

            const { error: upsertError } = await supabase
                .from('manager_roles')
                .upsert(roleData, { onConflict: 'email' });

            if (upsertError) {
                console.error(`  - ❌ 寫入角色資料失敗:`, upsertError);
            } else {
                console.log(`  - ✅ 角色資料設定完成`);
            }

        } catch (err) {
            console.error(`  - ❌ 處理失敗:`, err);
        }
        console.log('---');
    }

    console.log('\n🎉 所有測試帳號處理完畢！');
    console.log('請使用以下帳號登入測試：');
    TEST_ACCOUNTS.forEach(acc => {
        console.log(`Email: ${acc.email} | PW: ${acc.password} | Role: ${acc.role}`);
    });
}

setupTestManagers();
