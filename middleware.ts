import { NextRequest, NextResponse } from 'next/server'

// Защищённые маршруты — требуют авторизации (JWT)
const PROTECTED_ROUTES = ['/dashboard']

// Маршруты, доступные всем
// /vacancies — можно смотреть без авторизации, но "Подать заявку" требует авторизацию
// /worker — регистрация, всегда доступна

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Проверяем, защищённый ли маршрут
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  if (!isProtected) {
    return NextResponse.next()
  }

  // Проверяем токен из cookie или Authorization header
  const token = request.cookies.get('wego_token')?.value
    || request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    // Редирект на страницу регистрации
    const url = request.nextUrl.clone()
    url.pathname = '/worker'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Токен есть — пропускаем (валидация будет в API/странице)
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
