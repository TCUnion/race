import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tcusupabase2.zeabur.app';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function resetPassword() {
    const email = 'service@tsu.com.tw';
    const newPassword = '12345';

    console.log(`正在搜尋使用者: ${email}`);

    // List users to find the ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('列出使用者時發生錯誤:', listError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('找不到使用者');
        // 如果找不到，嘗試建立使用者
        console.log('嘗試建立使用者...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: newPassword,
            email_confirm: true
        });

        if (createError) {
            console.error('建立使用者失敗:', createError);
        } else {
            console.log('使用者建立成功:', newUser.user.id);
        }
        return;
    }

    console.log(`找到使用者 ID: ${user.id}`);
    console.log('正在更新密碼...');

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    );

    if (updateError) {
        console.error('更新密碼時發生錯誤:', updateError);
    } else {
        console.log('密碼更新成功！');
    }
}

resetPassword();
