<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { silentLogin } from './utils/auth';
import { useUserStore } from './stores/user';

onLaunch(async () => {
  try {
    await silentLogin();
    const userStore = useUserStore();
    await userStore.fetchProfile();
  } catch (e) {
    console.error('Silent login failed:', e);
  }
});
</script>
