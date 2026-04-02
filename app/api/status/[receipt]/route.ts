import { NextResponse } from 'next/server'
import { AzureSqlDB } from '@/lib/db/azure-sql'

export async function GET(
  request: Request,
  { params }: { params: { receipt: string } }
) {
  try {
    const receipt = params.receipt

    if (!receipt) {
      return NextResponse.json(
        {
          code: 'MISSING_PARAMETER',
          message: '접수번호가 필요합니다',
        },
        { status: 400 }
      )
    }

    // 접수번호로 조회
    const application = await AzureSqlDB.getApplicationByReceipt(receipt)

    if (!application) {
      return NextResponse.json(
        {
          code: 'NOT_FOUND',
          message: '해당 접수번호를 찾을 수 없습니다',
        },
        { status: 404 }
      )
    }

    // Debug: companions structure
    console.log('[v0 API] Returning application with companions:', JSON.stringify((application as any).companions, null, 2))

    return NextResponse.json(application)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
