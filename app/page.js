import { redirect } from 'next/navigation';

// الصفحة الرئيسية كانت ناقصة تمامًا - ده سبب الـ 404. بتحوّل لصفحة الدخول مباشرة.
export default function HomePage() {
  redirect('/login');
}
