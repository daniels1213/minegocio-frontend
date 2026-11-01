<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

const props = withDefaults(defineProps<{
  modelValue: string
  autocomplete?: string
  required?: boolean
  label?: string
}>(), {
  autocomplete: 'tel',
  required: false,
  label: 'Código de país',
})
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()

const displayNames = new Intl.DisplayNames(['es'], { type: 'region' })
const countryCodes = getCountries()
const countryOptions = countryCodes
  .map((code) => ({
    code,
    name: displayNames.of(code) || code,
    callingCode: getCountryCallingCode(code),
  }))
  .sort((left, right) => left.code === 'CU' ? -1 : right.code === 'CU' ? 1 : left.name.localeCompare(right.name, 'es'))

let lastEmittedValue = ''
const country = ref<CountryCode>('CU')
const nationalNumber = ref('')

const callingCode = computed(() => getCountryCallingCode(country.value))

function syncFromModel(value: string) {
  if (!value) {
    country.value = 'CU'
    nationalNumber.value = ''
    return
  }
  const parsed = parsePhoneNumberFromString(value, 'CU')
  if (parsed) {
    country.value = parsed.country || 'CU'
    nationalNumber.value = parsed.nationalNumber
    return
  }
  country.value = 'CU'
  nationalNumber.value = value.replace(/\D/g, '')
}

function emitPhoneNumber() {
  const digits = nationalNumber.value.replace(/\D/g, '')
  const value = digits ? `+${callingCode.value}${digits}` : ''
  lastEmittedValue = value
  emit('update:modelValue', value)
}

function onNumberInput(value: string) {
  const trimmed = value.trim()
  if (trimmed.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(trimmed)
    if (parsed) {
      country.value = parsed.country || country.value
      nationalNumber.value = parsed.nationalNumber
      emitPhoneNumber()
      return
    }
  }
  nationalNumber.value = value.replace(/\D/g, '')
  emitPhoneNumber()
}

watch(() => props.modelValue, (value) => {
  if (value === lastEmittedValue) return
  syncFromModel(value)
}, { immediate: true })

onMounted(() => {
  if (props.modelValue) emitPhoneNumber()
})
</script>

<template>
  <div class="phone-input">
    <select v-model="country" :aria-label="props.label" @change="emitPhoneNumber">
      <option v-for="option in countryOptions" :key="option.code" :value="option.code">
        {{ option.name }} (+{{ option.callingCode }})
      </option>
    </select>
    <input
      :value="nationalNumber"
      type="tel"
      inputmode="tel"
      :autocomplete="props.autocomplete"
      :required="props.required"
      :aria-label="props.label === 'Código de país' ? 'Número de teléfono' : props.label"
      @input="onNumberInput(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<style scoped>
.phone-input{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,2fr);gap:8px;width:100%;min-width:0}
.phone-input select,.phone-input input{width:100%;min-width:0;min-height:42px;padding:10px;border:1px solid #e8e8e8;border-radius:8px;background:#fff;color:#171717;font:inherit;font-weight:400}
.phone-input select{font-size:13px}
.phone-input input:focus,.phone-input select:focus{border-color:#c65b19;outline:2px solid rgba(198,91,25,.12)}
@media(max-width:440px){.phone-input{grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)}}
</style>
