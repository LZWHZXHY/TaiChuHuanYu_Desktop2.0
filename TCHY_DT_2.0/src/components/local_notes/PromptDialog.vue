<!-- src/components/PromptDialog.vue -->
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  title: string;
  value?: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'confirm', value: string): void;
  (e: 'cancel'): void;
}>();

const inputValue = ref(props.value || '');
const inputRef = ref<HTMLInputElement | null>(null);

// 自动聚焦
onMounted(() => {
  if (props.visible) {
    nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  }
});

function handleConfirm() {
  const val = inputValue.value.trim();
  if (val) {
    emit('confirm', val);
  }
}

function handleCancel() {
  emit('cancel');
}

// 键盘事件
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleConfirm();
  } else if (e.key === 'Escape') {
    handleCancel();
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="overlay" @click.self="handleCancel">
      <div class="dialog">
        <div class="dialog-title">{{ title }}</div>
        <input
          ref="inputRef"
          v-model="inputValue"
          :placeholder="placeholder || '请输入...'"
          class="dialog-input"
          @keydown="onKeydown"
        />
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="handleCancel">取消</button>
          <button class="btn btn-primary" @click="handleConfirm">确认</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog {
  background: #ffffff;
  border-radius: 12px;
  padding: 28px 32px 24px;
  min-width: 340px;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.dialog-title {
  font-size: 16px;
  font-weight: 400;
  color: #1a1a1a;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.dialog-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 300;
  outline: none;
  transition: border-color 0.2s;
  background: #fafafa;
  color: #1a1a1a;
  box-sizing: border-box;
}
.dialog-input:focus {
  border-color: #1a1a1a;
  background: #ffffff;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 8px 22px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 300;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: #1a1a1a;
  color: #fff;
}
.btn-primary:hover {
  background: #333;
}

.btn-secondary {
  background: #f0f0f0;
  color: #555;
}
.btn-secondary:hover {
  background: #e5e5e5;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-active .dialog,
.fade-leave-active .dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.fade-enter-from .dialog,
.fade-leave-to .dialog {
  transform: scale(0.96);
  opacity: 0;
}
</style>