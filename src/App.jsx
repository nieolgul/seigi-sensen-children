import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import StatusManager from './StatusManager'
import './App.css'
import AnonymousBoard from './AnonymousBoard'

function App() {
  const [page, setPage] = useState('home')
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [magicalGirl, setMagicalGirl] = useState(null)
  const [isEditingCharacter, setIsEditingCharacter] = useState(false)
const [girlName, setGirlName] = useState('')
const [girlLoading, setGirlLoading] = useState(false)
const [girlMessage, setGirlMessage] = useState('')
const [nameKo, setNameKo] = useState('')
const [nameJa, setNameJa] = useState('')
const [grade, setGrade] = useState('')
const [position, setPosition] = useState('magical_girl')
const [headshotFile, setHeadshotFile] = useState(null)
const [standingFile, setStandingFile] = useState(null)
const [headshotUrl, setHeadshotUrl] = useState('')
const [standingUrl, setStandingUrl] = useState('')
const getHeadshotUrl = (path) => {
  if (!path) return ''

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const { data } = supabase.storage
    .from('character-images')
    .getPublicUrl(path)

  return data.publicUrl
}

const [walletTransactions, setWalletTransactions] = useState([])

const [shopItems, setShopItems] = useState([])
const [inventoryItems, setInventoryItems] = useState([])
const [shopLoading, setShopLoading] = useState(false)
const [shopMessage, setShopMessage] = useState('')
const [buyingItem, setBuyingItem] = useState('')

const [walletLoading, setWalletLoading] = useState(false)
const [walletMessage, setWalletMessage] = useState('')

const [walletType, setWalletType] = useState('income')
const [walletCategory, setWalletCategory] = useState('color_log')
const [walletDescription, setWalletDescription] = useState('')
const [walletQuantity, setWalletQuantity] = useState('1')
const [walletAmount, setWalletAmount] = useState('')

const [availableGirls, setAvailableGirls] = useState([])
const [assignedGirl, setAssignedGirl] = useState(null)
const [selectedGirlId, setSelectedGirlId] = useState('')
const [assignmentLoading, setAssignmentLoading] = useState(false)
const [assignmentMessage, setAssignmentMessage] = useState('')
const [showGirlSelector, setShowGirlSelector] = useState(false)

const [managedGirls, setManagedGirls] = useState([])
const [selectedManagedGirl, setSelectedManagedGirl] = useState(null)



const openGirlSelector = async () => {
  setShowGirlSelector(true)
  setAssignmentLoading(true)
  setAssignmentMessage('')

  console.log('마법소녀 목록 불러오기 실행됨')
  try {
    const [{ data: girls, error: girlsError }, { data: assigned, error: assignedError }] =
      await Promise.all([
        supabase.rpc('list_available_magical_girls'),
        supabase.rpc('get_assigned_magical_girl'),
      ])

    if (girlsError) throw girlsError
    if (assignedError) throw assignedError
console.log('조회 결과:', girls, '오류:', girlsError)
    setAvailableGirls(girls ?? [])

console.log('마법소녀 목록:', girls, '조회 오류:', girlsError)
setAvailableGirls(girls ?? [])

    const currentGirl = assigned?.[0] ?? null
    setAssignedGirl(currentGirl)
    setSelectedGirlId(currentGirl?.id ?? '')
  } catch (error) {
    console.error(error)
    setAssignmentMessage(error.message || '마법소녀 목록을 불러오지 못했습니다.')
  } finally {
    setAssignmentLoading(false)
  }
}


const saveGirlAssignment = async (girlId = selectedGirlId) => {
  if (!girlId) {
    setAssignmentMessage('담당할 마법소녀를 선택해 주세요.')
    return
  }

  setAssignmentLoading(true)
  setAssignmentMessage('')

  try {
    const { error } = await supabase.rpc('assign_magical_girl', {
      p_girl_id: girlId,
    })

    if (error) throw error

    const { data, error: loadError } = await supabase.rpc(
      'get_assigned_magical_girl'
    )

    if (loadError) throw loadError

    setAssignedGirl(data?.[0] ?? null)
    setSelectedGirlId(girlId)
    setAssignmentMessage('담당 마법소녀 지정에 성공했습니다.')
  } catch (error) {
    console.error(error)
    setAssignmentMessage(
      error.message || '담당 지정에 실패했습니다.'
    )
  } finally {
    setAssignmentLoading(false)
  }
}


const [statusRecord, setStatusRecord] = useState(null)
const [statusLoading, setStatusLoading] = useState(false)
const [statusMessage, setStatusMessage] = useState('')

// 담당 중인 마법소녀 목록 열기
const openStatusSelection = async () => {
  setStatusLoading(true)
  setStatusMessage('')

  try {
    const { data, error } = await supabase.rpc(
      'get_assigned_magical_girl'
    )

    if (error) throw error

    setManagedGirls(data ?? [])
    setSelectedManagedGirl(null)
    setStatusRecord(null)
    setPage('statusSelect')
  } catch (error) {
    console.error(error)
    setStatusMessage(
      error.message || '담당 마법소녀를 불러오지 못했습니다.'
    )
  } finally {
    setStatusLoading(false)
  }
}

// 선택한 마법소녀의 능력치 불러오기
const openManagedGirlStatus = async (girl) => {
  // 먼저 화면을 전환해서 로딩 화면을 표시
  setSelectedManagedGirl(girl)
  setStatusRecord(null)
  setStatusMessage('')
  setStatusLoading(true)
  setPage('statusManager')

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('다시 로그인해 주세요.')

    const { data, error } = await supabase
      .from('magical_girl_status')
      .select('*')
      .eq('girl_id', girl.id)
      .eq('commander_id', user.id)
      .maybeSingle()

    if (error) throw error

    setStatusRecord(data)
  } catch (error) {
    console.error(error)
    setStatusMessage(
      error.message || '능력치를 불러오지 못했습니다.'
    )
  } finally {
    setStatusLoading(false)
  }
}


const saveManagedGirlStatus = async ({ stats, points }) => {
  if (!selectedManagedGirl) {
    throw new Error('마법소녀를 먼저 선택해 주세요.')
  }

  if (!statusRecord) {
    throw new Error(
      '저장할 스테이터스 기록이 없습니다. 먼저 DB에 초기 기록을 만들어야 합니다.'
    )
  }

  const statKeys = [
    'luck',
    'power',
    'health',
    'defense',
    'agility',
    'skill',
  ]

  const originalStats = Object.fromEntries(
    statKeys.map((key) => [key, Number(statusRecord[key] ?? 0)])
  )

  let spentNow = 0

  for (const key of statKeys) {
    const increase = Number(stats[key]) - originalStats[key]

    if (increase < 0) {
      throw new Error('이미 투자한 능력치는 낮출 수 없습니다.')
    }

    if (increase > 0) {
      const { error } = await supabase.rpc(
        'invest_magical_girl_stat',
        {
          p_girl_id: selectedManagedGirl.id,
          p_stat: key,
          p_amount: increase,
        }
      )

      if (error) throw error

      spentNow += increase
    }
  }

  const { data, error } = await supabase
    .from('magical_girl_status')
    .select('*')
    .eq('girl_id', selectedManagedGirl.id)
    .eq('commander_id', statusRecord.commander_id)
    .single()

  if (error) throw error

  setStatusRecord(data)
  setStatusMessage('')
}


const walletIncome = walletTransactions
  .filter((item) => item.type === 'income')
  .reduce((sum, item) => sum + item.amount, 0)

const walletExpense = walletTransactions
  .filter((item) => item.type === 'expense')
  .reduce((sum, item) => sum + item.amount, 0)

const walletBalance = walletIncome - walletExpense


const loadShopItems = async () => {
  setShopLoading(true)
  setShopMessage('')

  try {
    const { data, error } = await supabase
      .from('shop_items')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) throw error
    setShopItems(data ?? [])
  } catch (error) {
    setShopMessage(error.message || '상점 목록을 불러오지 못했습니다.')
  } finally {
    setShopLoading(false)
  }
}



const loadInventoryItems = async () => {
  setShopLoading(true)
  setShopMessage('')

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('다시 로그인해 주세요.')

    const { data, error } = await supabase
      .from('inventories')
      .select(`
        id,
        quantity,
        item_id,
        shop_items (
          id,
          item_key,
          name,
          description,
          image_path
        )
      `)
      .eq('commander_id', user.id)
      .gt('quantity', 0)

    if (error) throw error

    setInventoryItems(data ?? [])
  } catch (error) {
    setShopMessage(
      error.message || '인벤토리를 불러오지 못했습니다.'
    )
  } finally {
    setShopLoading(false)
  }
}

const purchaseItem = async (item) => {
  if (buyingItem) return

  const quantity = 1
  setBuyingItem(item.item_key)
  setShopMessage('')

  try {
    const { data, error } = await supabase.rpc('purchase_shop_item', {
      p_item_key: item.item_key,
      p_quantity: quantity,
    })

    if (error) throw error

    // 구매 결과를 화면에 반영
    const { data: { user }, error: userError } =
      await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('다시 로그인해 주세요.')

    const { data: transactions, error: transactionError } =
      await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('commander_id', user.id)
        .order('created_at', { ascending: false })

    if (transactionError) throw transactionError
    setWalletTransactions(transactions ?? [])

    await loadInventoryItems()

    setShopMessage(
      `${data.item_name} ${data.quantity}개를 구매했습니다.`
    )
  } catch (error) {
    setShopMessage(error.message || '구매에 실패했습니다.')
  } finally {
    setBuyingItem('')
  }
}

const handleAddTransaction = async (e) => {
  e.preventDefault()
  setWalletMessage('')

  const quantity = Number(walletQuantity)
  const isLog = ['color_log', 'monochrome_log'].includes(walletCategory)

  let amount = Number(walletAmount)

  if (isLog) {
    amount = quantity * (walletCategory === 'color_log' ? 10 : 5)
  }

  if (!walletDescription.trim()) {
    setWalletMessage('내역 이름을 입력해 주세요.')
    return
  }

  if (isLog && (!Number.isInteger(quantity) || quantity < 1)) {
    setWalletMessage('컷 수는 1 이상 정수로 입력해 주세요.')
    return
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    setWalletMessage('금액은 1엔 이상의 정수로 입력해 주세요.')
    return
  }

  if (walletType === 'expense' && amount > walletBalance) {
    setWalletMessage('잔액이 부족합니다.')
    return
  }

  setWalletLoading(true)

  try {
    const { data: { user }, error: userError } =
      await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('다시 로그인해 주세요.')

    const { error } = await supabase
      .from('wallet_transactions')
      .insert({
        commander_id: user.id,
        type: walletType,
        category: walletCategory,
        description: walletDescription.trim(),
        amount,
        quantity: isLog ? quantity : null,
      })

    if (error) throw error

    const { data, error: reloadError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('commander_id', user.id)
      .order('created_at', { ascending: false })

    if (reloadError) throw reloadError

    setWalletTransactions(data ?? [])
    setWalletDescription('')
    setWalletQuantity('1')
    setWalletAmount('')
    setWalletMessage('거래 내역을 추가했습니다.')
  } catch (error) {
    setWalletMessage(error.message || '거래 내역 저장에 실패했습니다.')
  } finally {
    setWalletLoading(false)
  }
}


  const dailyQuests = [
    {
      name: '보고서 작성',
      stat: '행운',
      english: 'LUCK',
      icon: '✦',
      description: '임무 보고서를 작성하고 작전의 흐름을 분석한다.',
    },
    {
      name: '전술 훈련',
      stat: '무력',
      english: 'STRENGTH',
      icon: '⚔',
      description: '실전 상황을 상정한 전투 훈련을 실시한다.',
    },
    {
      name: '기초 체력 단련',
      stat: '건강',
      english: 'HEALTH',
      icon: '♡',
      description: '꾸준한 훈련으로 신체의 기초 능력을 단련한다.',
    },
    {
      name: '방어술 이론',
      stat: '방어',
      english: 'DEFENSE',
      icon: '◇',
      description: '방어 전술과 위기 대응 방법을 학습한다.',
    },
    {
      name: '기동 훈련',
      stat: '민첩',
      english: 'AGILITY',
      icon: '➶',
      description: '빠른 판단과 민첩한 움직임을 익힌다.',
    },
    {
      name: '실전 모의 훈련',
      stat: '숙련',
      english: 'PROFICIENCY',
      icon: '◎',
      description: '반복 훈련으로 임무 수행 능력을 높인다.',
    },
  ]

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [passwordConfirm, setPasswordConfirm] = useState('')
const [message, setMessage] = useState('')
const [loading, setLoading] = useState(false)

useEffect(() => {
  let cancelled = false

  const loadWallet = async () => {
    if (!isLoggedIn || !['mypage', 'wallet'].includes(page)) return

    setWalletLoading(true)

    try {
      const { data: { user }, error: userError } =
        await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('다시 로그인해 주세요.')

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('commander_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!cancelled) setWalletTransactions(data ?? [])
    } catch (error) {
      if (!cancelled) {
        setWalletMessage(error.message || '지갑 정보를 불러오지 못했습니다.')
      }
    } finally {
      if (!cancelled) setWalletLoading(false)
    }
  }

  loadWallet()

  return () => {
    cancelled = true
  }
}, [isLoggedIn, page])

// 로그인 세션 확인
// 로그인 세션 확인
useEffect(() => {
  let mounted = true

  const checkSession = async () => {
    const { data, error } = await supabase.auth.getSession()

    if (!mounted) return

    if (error) {
      setIsLoggedIn(false)
    } else {
      setIsLoggedIn(!!data.session)
    }

    setAuthChecking(false)
  }

  checkSession()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!mounted) return

    setIsLoggedIn(!!session)
    setAuthChecking(false)
  })

  return () => {
    mounted = false
    subscription.unsubscribe()
  }
}, [])

// 로그인한 계정의 캐릭터 정보 불러오기
useEffect(() => {
  let cancelled = false

  const loadMagicalGirl = async () => {
    if (!isLoggedIn) {
      setMagicalGirl(null)
      setGirlName('')
      setNameKo('')
      setNameJa('')
      setGrade('')
      setPosition('magical_girl')
      setHeadshotUrl('')
      setStandingUrl('')
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (cancelled) return

    if (userError || !user) {
      setMagicalGirl(null)
      return
    }

    const { data, error } = await supabase
      .from('magical_girls')
      .select('*')
      .eq('commander_id', user.id)
      .maybeSingle()

    if (cancelled) return

    if (error) {
      console.error('캐릭터 정보 불러오기 실패:', error.message)
      setGirlMessage('캐릭터 정보를 불러오지 못했습니다.')
      return
    }

    setMagicalGirl(data)
    setGirlName(data?.name ?? '')
    setNameKo(data?.name_ko ?? data?.name ?? '')
    setNameJa(data?.name_ja ?? '')
    setGrade(data?.grade ?? '')
    setPosition(data?.position ?? 'magical_girl')

    if (data?.headshot_url) {
      const { data: imageData } = await supabase.storage
        .from('character-images')
        .createSignedUrl(data.headshot_url, 3600)

      if (!cancelled) setHeadshotUrl(imageData?.signedUrl ?? '')
    } else {
      setHeadshotUrl('')
    }

    if (data?.standing_url) {
      const { data: imageData } = await supabase.storage
        .from('character-images')
        .createSignedUrl(data.standing_url, 3600)

      if (!cancelled) setStandingUrl(imageData?.signedUrl ?? '')
    } else {
      setStandingUrl('')
    }
  }

  loadMagicalGirl()

  return () => {
    cancelled = true
  }
}, [isLoggedIn])
  const handleAuth = async (e) => {
    e.preventDefault()
    setMessage('')

    if (loading) return

    if (page === 'signup' && password !== passwordConfirm) {
      setMessage('입력된 비밀번호가 다릅니다.')
      return
    }

    setLoading(true)

    try {
      if (page === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: email.trim().toLowerCase(),
            },
          },
        })

        if (error) throw error

alert(
  data.user && data.user.identities?.length === 0
    ? '이미 가입된 이메일입니다.'
    : '가입이 승인되었습니다. 바로 로그인이 가능합니다.',
)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error

setIsLoggedIn(true)
setPage('home')
setMessage('')
alert('로그인 성공!')
      }
    } catch (error) {
      setMessage(error.message || '오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }
const handleSaveGirl = async (e) => {
  e.preventDefault()
  setGirlMessage('')

  if (!nameKo.trim() || !nameJa.trim() || !grade.trim()) {
    setGirlMessage('이름과 학년을 모두 입력해 주세요.')
    return
  }

  setGirlLoading(true)

  try {
    const { data: { user }, error: userError } =
      await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('다시 로그인해 주세요.')

    const uploadImage = async (file, type) => {
      if (!file) return null

      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드할 수 있습니다.')
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${user.id}/${Date.now()}-${type}-${safeName}`

      const { error } = await supabase.storage
        .from('character-images')
        .upload(path, file)

      if (error) throw error
      return path
    }

    const newHeadshotPath = await uploadImage(headshotFile, 'headshot')
    const newStandingPath = await uploadImage(standingFile, 'standing')

    const characterData = {
      name: nameKo.trim(),
      name_ko: nameKo.trim(),
      name_ja: nameJa.trim(),
      grade: grade.trim(),
      position,
      ...(newHeadshotPath && { headshot_url: newHeadshotPath }),
      ...(newStandingPath && { standing_url: newStandingPath }),
    }

    if (magicalGirl) {
      const { data, error } = await supabase
        .from('magical_girls')
        .update(characterData)
        .eq('id', magicalGirl.id)
        .eq('commander_id', user.id)
        .select()
        .single()

      if (error) throw error
      setMagicalGirl(data)
    } else {
      const { data, error } = await supabase
        .from('magical_girls')
        .insert({
          ...characterData,
          commander_id: user.id,
          points: 0,
          luck_points: 0,
          strength_points: 0,
          health_points: 0,
          defense_points: 0,
          agility_points: 0,
          proficiency_points: 0,
        })
        .select()
        .single()

      if (error) throw error
      setMagicalGirl(data)
    }

    setHeadshotFile(null)
    setStandingFile(null)

    // 저장된 캐릭터 정보를 다시 불러오기
    const { data: savedCharacter, error: reloadError } = await supabase
      .from('magical_girls')
      .select('*')
      .eq('commander_id', user.id)
      .single()

    if (reloadError) throw reloadError

    setMagicalGirl(savedCharacter)
    setGirlName(savedCharacter.name ?? '')
    setNameKo(savedCharacter.name_ko ?? savedCharacter.name ?? '')
    setNameJa(savedCharacter.name_ja ?? '')
    setGrade(savedCharacter.grade ?? '')
    setPosition(savedCharacter.position ?? 'magical_girl')

    // 비공개 이미지의 열람 주소 만들기
    const { data: headshotData } = savedCharacter.headshot_url
      ? await supabase.storage
          .from('character-images')
          .createSignedUrl(savedCharacter.headshot_url, 3600)
      : { data: null }

    const { data: standingData } = savedCharacter.standing_url
      ? await supabase.storage
          .from('character-images')
          .createSignedUrl(savedCharacter.standing_url, 3600)
      : { data: null }

    setHeadshotUrl(headshotData?.signedUrl ?? '')
    setStandingUrl(standingData?.signedUrl ?? '')

    setIsEditingCharacter(false)

    setGirlMessage(
      magicalGirl
        ? '캐릭터 정보가 수정되었습니다.'
        : '캐릭터 등록이 완료되었습니다.'
    )
  } catch (error) {
    console.error('Character save failed:', error)
    setGirlMessage(error.message || '저장 중 오류가 발생했습니다.')
  } finally {
    setGirlLoading(false)
  }
}
  return (
<main className={`site ${page !== 'home' && isLoggedIn ? 'subpage-active' : ''}`}>
  {isLoggedIn && !authChecking && (
  <button
    className="my-page-nav"
    onClick={() => {
      setPage('mypage')
      setGirlMessage('')
    }}
  >
    MY PAGE ↗
  </button>
)}

      <section className="hero">
        <div className="hero-decoration decoration-left">JUSTICE<br />FOR ALL</div>
        <div className="hero-decoration decoration-right">MAGICAL GIRL<br />× COMMANDER</div>

        <div className="hero-content">
          

{page !== 'home' && isLoggedIn ? (
  <div className="logo-frame subpage-logo-frame">
    <img
      className="site-logo subpage-logo"
      src="/subpage-logo.svg"
      alt="正義戦線⭐︎チルドレン"
      role="button"
      tabIndex={0}
      title="HOME"
      onClick={() => {
        setPage('home')
        setSelectedQuest(null)
        setGirlMessage('')
        setWalletMessage('')
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setPage('home')
          setSelectedQuest(null)
          setGirlMessage('')
          setWalletMessage('')
        }
      }}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  </div>

) : (
  <>
    <p className="eyebrow">
      <span /> 国立天の川特別育成機関 <span />
    </p>

    <div className="logo-frame">
      <div className="frame-corner corner-tl" />
      <div className="frame-corner corner-tr" />
      <div className="frame-corner corner-bl" />
      <div className="frame-corner corner-br" />
      <img
        className="site-logo"
        src="/logo.svg"
        alt="正義戦線⭐︎チルドレン"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    </div>

    <p className="hero-subtitle">
      君の明日を守るため。
    </p>
  </>
)}


          <div className="hero-rule">
            <span />
            <span className="rule-star">⭐︎</span>
            <span />
          </div>

{authChecking ? (
  <div className="auth-panel">
    <p className="auth-kicker">SYSTEM / SESSION CHECK</p>
    <h2>LOADING...</h2>
    <p className="auth-description">
      접속 권한을 확인하고 있습니다.
    </p>
  </div>
) : page === 'home' && isLoggedIn ? (
  <div className="dashboard">
    <div className="dashboard-heading">
      <p className="auth-kicker">COMMAND CENTER / 001</p>
      <h2>작전 지휘실</h2>
      <p className="auth-description">
        세계의 미래를 바꾸는 작전이 시작된다.
      </p>
    </div>

        <div className="dashboard-notice">
      <span>◆ SYSTEM NOTICE</span>
      <p>지휘관의 임무 수행을 기다리고 있습니다.</p>
    </div>

    
    <div className="dashboard-grid">
      <button
        className="dashboard-item"
        onClick={() => setPage('quests')}
      >
        <span className="dashboard-number">01 / QUEST</span>
        <span className="dashboard-icon">✦</span>
        <strong>일일 임무</strong>
        <span className="dashboard-description">
          지휘관 전용 카테고리입니다.<br />
          일일 임무를 진행하고 마법소녀를 육성하세요.
        </span>
        <span className="dashboard-arrow">↗</span>
      </button>

      <button
        className="dashboard-item"
        onClick={() => setPage('board')}
      >
        <span className="dashboard-number">02 / NOTE</span>
        <span className="dashboard-icon">✎</span>
        <strong>익명 게시판</strong>
        <span className="dashboard-description">
          하고 싶은 말을 자유롭게 남겨 보세요.<br />
          모든 글은 익명으로 표시됩니다.
        </span>
        <span className="dashboard-arrow">↗</span>
      </button>

      <button
        className="dashboard-item"
        onClick={async () => {
  setPage('shop')
  await loadShopItems()
}}
      >
        <span className="dashboard-number">03 / SHOP</span>
        <span className="dashboard-icon">♢</span>
        <strong>상점</strong>
        <span className="dashboard-description">
          포인트를 사용해 아이템을 구매하세요.
        </span>
        <span className="dashboard-arrow">↗</span>
      </button>

      <button
        className="dashboard-item battle-item"
        onClick={() => alert('전투 투입은 다음 단계에서 만들자!')}
      >
        <span className="dashboard-number">04 / DEPLOYMENT</span>
        <span className="dashboard-icon">⚔</span>
        <strong>전투 투입</strong>
        <span className="dashboard-description">
          마법소녀를 전장에 투입하세요.
        </span>
        <span className="dashboard-arrow">↗</span>
      </button>
    </div>


    <button
      className="switch-button"
      onClick={async () => {
        await supabase.auth.signOut()
        setIsLoggedIn(false)
        setPage('home')
        setMessage('')
      }}
    >
      LOGOUT ↗
    </button>
  </div>
  

) : page === 'statusSelect' && isLoggedIn ? (
  <div className="auth-panel">
    <button
      className="back-button"
      onClick={() => setPage('mypage')}
    >
      ← BACK
    </button>

    <p className="auth-kicker">MAGICAL GIRL ARCHIVE</p>
    <h2>담당 마법소녀 관리</h2>

{statusLoading ? (
  <p>목록을 불러오는 중...</p>
) : managedGirls.length === 0 ? (
  <p>담당 중인 마법소녀가 없습니다.</p>
) : (
  <div className="magical-girl-grid">
    {managedGirls.map((girl) => (
      <button
        className="magical-girl-item"
        key={girl.id}
        onClick={() => openManagedGirlStatus(girl)}
      >
        <span className="magical-girl-portrait">
          {girl.headshot_url ? (
            <img
  src={getHeadshotUrl(girl.headshot_url)}
  alt={girl.name_ko || girl.name || '마법소녀'}
/>
          ) : (
            <span className="portrait-placeholder">✦</span>
          )}
        </span>

        <span className="magical-girl-name">
          {girl.name_ko || girl.name || '이름 없는 마법소녀'}
        </span>
      </button>
    ))}
  </div>
)}

    {statusMessage && (
      <p role="status">{statusMessage}</p>
    )}
  </div>

) : page === 'statusManager' && isLoggedIn ? (
  <div className="auth-panel">
    <button
      className="back-button"
      onClick={() => {
        setPage(
          magicalGirl?.position === 'commander'
            ? 'statusSelect'
            : 'mypage'
        )
        setStatusMessage('')
      }}
    >
      ← BACK
    </button>

{statusLoading ? (
  <StatusLoadingScreen />
) : selectedManagedGirl ? (
      <>
        {statusRecord ? (
          <StatusManager
            key={selectedManagedGirl.id}
            girl={selectedManagedGirl}
            initialStats={{
              luck: statusRecord.luck,
              power: statusRecord.power,
              health: statusRecord.health,
              defense: statusRecord.defense,
              agility: statusRecord.agility,
              skill: statusRecord.skill,
            }}
            initialPoints={statusRecord.available_points}
            onApply={saveManagedGirlStatus}
          />
        ) : (
          <p>
            저장된 스테이터스 기록이 없습니다.<br />
            초기 기록을 만든 뒤 다시 시도해 주세요.
          </p>
        )}
      </>
    ) : (
      <p>마법소녀를 선택해 주세요.</p>
    )}

    {statusMessage && (
      <p role="status">{statusMessage}</p>
    )}
  </div>


) : page === 'girlSelect' && isLoggedIn ? (
  <main className="girl-select-page">
    <header className="girl-select-header">
      <span className="girl-select-eyebrow">MAGICAL GIRL ARCHIVE</span>
      <h1>담당 마법소녀</h1>
      <p>담당할 마법소녀를 선택해 주세요.</p>

    </header>

    <section className="girl-select-grid">
      {availableGirls.length === 0 ? (
        <p className="girl-empty">
          현재 지정할 수 있는 마법소녀가 없습니다.
        </p>
      ) : (
        availableGirls.map((girl) => (
          <article className="girl-select-card" key={girl.id}>
            <div className="girl-select-image">
              {girl.headshot_url ? (
<img
  src={
    girl.headshot_url?.startsWith('http')
      ? girl.headshot_url
      : supabase.storage
          .from('character-images')
          .getPublicUrl(girl.headshot_url)
          .data.publicUrl
  }
  alt={girl.name_ko || girl.name}
/>
              ) : (
                <span>NO IMAGE</span>
              )}
            </div>

            <div className="girl-select-info">
            
              <h2>{girl.name_ko || girl.name}</h2>

              {girl.name_ja && <p>{girl.name_ja}</p>}
              {girl.grade && <span>{girl.grade}</span>}

<button
  disabled={assignmentLoading}
  onClick={() => saveGirlAssignment(girl.id)}
>
  {assignedGirl?.id === girl.id ? '담당 지정 중' : '담당 지정'}
</button>
            </div>
          </article>
        ))
      )}
    </section>

    {assignmentLoading && <p>처리 중...</p>}
    {assignmentMessage && <p>{assignmentMessage}</p>}
  </main>

) : page === 'board' && isLoggedIn ? (
  <AnonymousBoard onBack={() => setPage('home')} />

) : page === 'mypage' && isLoggedIn ? (
  <div className="auth-panel mypage-panel">
    <button
      className="back-button"
      onClick={() => {
        setPage('home')
        setGirlMessage('')
      }}
    >
      ← BACK
    </button>

    <p className="auth-kicker">ACCOUNT / MY PAGE</p>
    <h2>MY PAGE</h2>

    {magicalGirl && !isEditingCharacter ? (
      <div className="character-profile">

  <div className="character-profile-top">
    <div className="character-headshot">
      {headshotUrl ? (
        <img src={headshotUrl} alt="캐릭터 두상" />
      ) : (
        <div className="character-image-empty">NO IMAGE</div>
      )}
    </div>

    <div className="character-profile-info">
      <h3>{magicalGirl.name_ko || magicalGirl.name}</h3>
      <p className="character-name-ja">{magicalGirl.name_ja}</p>

      <div className="character-meta">
        <span>
          {magicalGirl.position === 'commander' ? '지휘관' : '마법소녀'}
        </span>
        <span>{magicalGirl.grade}</span>
      </div>
    </div>
  </div>
  
<div className="wallet-profile-summary">
  <div>
    <span className="wallet-label">MY WALLET</span>
    <strong>¥ {walletBalance.toLocaleString('ja-JP')}</strong>
  </div>

  <button
    type="button"
    className="wallet-manage-button"
    onClick={() => {
      setWalletMessage('')
      setPage('wallet')
    }}
  >
    지갑 관리 ↗
  </button>
</div>


  <div className="character-profile-bottom">
    <div className="character-standing">
      {standingUrl ? (
        <img src={standingUrl} alt="캐릭터 스탠딩" />
      ) : (
        <div className="character-image-empty">NO STANDING</div>
      )}
    </div>

    <div className="character-profile-actions">
      <button
        className="dashboard-item"
onClick={async () => {
  if (magicalGirl.position === 'commander') {
    await openStatusSelection()
  } else {
    await openManagedGirlStatus(magicalGirl)
  }
}}
      >
        <span className="dashboard-number">01 / STATUS</span>
        <strong>
          {magicalGirl.position === 'commander'
            ? '마법소녀 관리'
            : '스테이터스 수정'}
        </strong>
        <span className="dashboard-arrow">↗</span>
      </button>


<button
  className="dashboard-item"
  onClick={() => {
    setPage('inventory')
    setShopMessage('')
  }}
>
  <span className="dashboard-number">02 / INVENTORY</span>
  <strong>인벤토리</strong>
  <span className="dashboard-arrow">↗</span>
</button>

    </div>

  </div>


  <button
    className="submit-button"
    onClick={() => {
      setGirlMessage('')
      setIsEditingCharacter(true)
    }}
  >
    EDIT CHARACTER INFO →
  </button>

  {girlMessage && (
    <p className="auth-description" role="status">
      {girlMessage}
    </p>
  )}
</div>

    ) : (
      <div className="mypage-section">
        <span className="dashboard-number">01 / CHARACTER DATA</span>
        <h3>{magicalGirl ? 'EDIT CHARACTER' : 'REGISTER CHARACTER'}</h3>

        <p className="auth-description">
          캐릭터 정보를 입력해 주세요. 등록한 정보는 나중에 수정할 수 있습니다.
        </p>

        <form onSubmit={handleSaveGirl}>
          <label htmlFor="name-ko">NAME (KOREAN)</label>
          <input
            id="name-ko"
            value={nameKo}
            onChange={(e) => setNameKo(e.target.value)}
            placeholder="한글 이름"
            maxLength={40}
            required
          />

          <label htmlFor="name-ja">NAME (JAPANESE)</label>
          <input
            id="name-ja"
            value={nameJa}
            onChange={(e) => setNameJa(e.target.value)}
            placeholder="日本語の名前"
            maxLength={40}
            required
          />

          <label htmlFor="grade">GRADE</label>
          <input
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="예: 중학교 1학년"
            maxLength={30}
            required
          />

          <label htmlFor="position">POSITION</label>
          <select
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            <option value="magical_girl">魔法少女 / 마법소녀</option>
            <option value="commander">指揮官 / 지휘관</option>
          </select>

          <div className="image-upload-section">
            <label htmlFor="headshot">CHARACTER PORTRAIT</label>
            <p className="auth-description">
              두상 이미지는 300 × 300px로 준비해 주세요.
              기존 이미지가 있다면 새 파일을 선택할 때 교체됩니다.
            </p>
            <input
              id="headshot"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setHeadshotFile(e.target.files?.[0] ?? null)
              }
            />

            <label htmlFor="standing">BATTLE STANDING</label>
            <p className="auth-description">
              전투용 스탠딩 이미지입니다. 배경투명화 PNG 파일을 권장합니다.
            </p>
            <input
              id="standing"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setStandingFile(e.target.files?.[0] ?? null)
              }
            />
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={girlLoading}
          >
            {girlLoading
              ? 'SAVING...'
              : magicalGirl
                ? 'SAVE CHANGES →'
                : 'REGISTER CHARACTER →'}
          </button>
        </form>

        {magicalGirl && (
          <button
            className="switch-button"
            onClick={() => {
              setIsEditingCharacter(false)
              setGirlMessage('')
            }}
          >
            CANCEL / BACK
          </button>
        )}

        {girlMessage && (
          <p className="auth-description" role="status">
            {girlMessage}
          </p>
        )}
      </div>
    )}
  </div>

) : page === 'inventory' && isLoggedIn ? (
  <div className="auth-panel shop-page">
    <button
      type="button"
      className="back-button"
      onClick={() => {
        setPage('mypage')
        setShopMessage('')
      }}
    >
      ← BACK
    </button>

    <p className="auth-kicker">ACCOUNT / INVENTORY</p>
    <h2>인벤토리</h2>

    <div className="dashboard-notice">
      <span>◆ INVENTORY GUIDE</span>
      <p>
        보유 중인 아이템을 확인할 수 있습니다.
        <br />
        아이템을 구매하면 이곳에 자동으로 반영됩니다.
      </p>
    </div>

    {shopLoading && (
      <p className="auth-description">인벤토리를 불러오는 중...</p>
    )}

    {!shopLoading && inventoryItems.length === 0 && (
      <p className="auth-description">
        아직 보유한 아이템이 없습니다.
      </p>
    )}

    <div className="dashboard-grid">
      {inventoryItems.map((item) => {
        const shopItem = item.shop_items

        if (!shopItem) return null

        return (
          <article
            className="dashboard-item shop-item"
            key={item.id}
          >
            <div className="shop-item-info">
              <img
                className="shop-item-image"
                src={shopItem.image_path}
                alt={shopItem.name}
              />

              <div className="shop-item-text">
                <strong>{shopItem.name}</strong>
                <p className="dashboard-description">
                  {shopItem.description}
                </p>
                <span className="shop-item-battle">
                  보유 수량: {item.quantity}개
                </span>
              </div>
            </div>
          </article>
        )
      })}
    </div>

    {shopMessage && (
      <p className="auth-description" role="status">
        {shopMessage}
      </p>
    )}
  </div>

) : page === 'shop' && isLoggedIn ? (
  <div className="auth-panel shop-page">
    <button
      className="back-button"
      onClick={() => {
        setPage('home')
        setShopMessage('')
      }}
    >
      ← BACK
    </button>

    <p className="auth-kicker">COMMAND CENTER / SHOP</p>
    <h2>상점</h2>

    <div className="wallet-total">
      <span>MY WALLET</span>
      <strong>¥ {walletBalance.toLocaleString('ja-JP')}</strong>
    </div>

    <div className="dashboard-notice">
      <span>◆ SHOP GUIDE</span>
      <p>
        모든 아이템은 상시 구매 및 사용이 가능합니다.<br />
        일부 아이템은 전투 중에도 행동을 소모하지 않고 사용할 수 있습니다.<br />
        아이템별 상세 설명을 확인해 주세요.
      </p>
    </div>

    {shopLoading && <p>불러오는 중...</p>}

    <div className="dashboard-grid">
      {shopItems.map((item) => (
        

<article className="dashboard-item shop-item" key={item.id}>
  <div className="shop-item-info">
    <img
      className="shop-item-image"
      src={item.image_path}
      alt={item.name}
    />

    <div className="shop-item-text">
      <strong>{item.name}</strong>
      <p className="dashboard-description">
        {item.description}
      </p>
      <span className="shop-item-battle">
        {item.battle_free ? '전투 중 사용 가능' : '전투 외 사용'}
      </span>
    </div>

    <strong className="shop-item-price">
      ¥ {item.price.toLocaleString('ja-JP')}
    </strong>
  </div>

  <div className="shop-item-bottom">
    <button
      className="submit-button shop-buy-button"
      disabled={!!buyingItem || shopLoading}
      onClick={() => purchaseItem(item)}
    >
      {buyingItem === item.item_key ? 'PURCHASING...' : '구매하기'}
    </button>
  </div>
</article>


      ))}
    </div>

    {shopMessage && (
      <p className="auth-description" role="status">
        {shopMessage}
      </p>
    )}
  </div>

) : page === 'wallet' && isLoggedIn ? (
  <div key="wallet-page" className="auth-panel wallet-panel">
    <button className="back-button" onClick={() => {
      setPage('mypage')
      setWalletMessage('')
    }}>
      ← BACK
    </button>

    <p className="auth-kicker">ACCOUNT / WALLET</p>
    <h2>MY WALLET</h2>

    <div className="wallet-layout">
      <div className="wallet-left-column">
        <div className="wallet-total">
          <span>CURRENT BALANCE</span>
          <strong>¥ {walletBalance.toLocaleString('ja-JP')}</strong>
          <div>
            <span>수입 ¥{walletIncome.toLocaleString('ja-JP')}</span>
            <span>지출 ¥{walletExpense.toLocaleString('ja-JP')}</span>
          </div>
        </div>

        <h3 className="wallet-history-title">TRANSACTION HISTORY</h3>

        {walletTransactions.length === 0 ? (
          <p className="auth-description">
            {walletLoading ? '내역을 불러오는 중...' : '아직 거래 내역이 없습니다.'}
          </p>
        ) : (
          <div className="wallet-history">
            {walletTransactions.map((item) => (
              <div className="wallet-transaction" key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <span>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    {' · '}
                    {({
                      color_log: '컬러 로그',
                      monochrome_log: '흑백 로그',
                      event: '이벤트 보상',
                      battle: '전투 보상',
                      shop: '상점 구매',
                      other: '기타',
                    })[item.category]}
                  </span>
                </div>
                <strong className={item.type === 'income' ? 'income-text' : 'expense-text'}>
                  {item.type === 'income' ? '+' : '−'}¥
                  {item.amount.toLocaleString('ja-JP')}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="wallet-right-column">
        <form className="wallet-form" onSubmit={handleAddTransaction}>
          <div className="wallet-type-switch">
            <button
              type="button"
              className={walletType === 'income' ? 'active income' : ''}
              onClick={() => {
                setWalletType('income')
                setWalletCategory('color_log')
                setWalletAmount('')
              }}
            >
              ＋ 수입
            </button>
            <button
              type="button"
              className={walletType === 'expense' ? 'active expense' : ''}
              onClick={() => {
                setWalletType('expense')
                setWalletCategory('other')
                setWalletAmount('')
              }}
            >
              − 지출
            </button>
          </div>

          <label htmlFor="wallet-category">거래 종류</label>
          <select
            id="wallet-category"
            value={walletCategory}
            onChange={(e) => {
              setWalletCategory(e.target.value)
              setWalletAmount('')
            }}
          >
            {walletType === 'income' ? (
              <>
                <option value="color_log">컬러 로그</option>
                <option value="monochrome_log">흑백 로그</option>
                <option value="event">이벤트 보상</option>
                <option value="battle">전투 보상</option>
                <option value="other">기타 수입</option>
              </>
            ) : (
              <option value="other">기타 지출</option>
            )}
          </select>

          <label htmlFor="wallet-description">내역 이름</label>
          <input
            id="wallet-description"
            value={walletDescription}
            onChange={(e) => setWalletDescription(e.target.value)}
            placeholder={
              walletCategory === 'event' ? '이벤트 이름'
              : walletCategory === 'color_log' ? '컬러 로그'
              : walletCategory === 'monochrome_log' ? '흑백 로그'
              : walletCategory === 'battle' ? '전투 보상'
              : walletCategory === 'other' && walletType === 'expense' ? '지출 내역'
              : '내역을 입력해 주세요'
            }
            maxLength={100}
            required
          />

          {['color_log', 'monochrome_log'].includes(walletCategory) ? (
            <>
              <label htmlFor="wallet-quantity">컷 수</label>
              <input
                id="wallet-quantity"
                type="number"
                min="1"
                step="1"
                value={walletQuantity}
                onChange={(e) => setWalletQuantity(e.target.value)}
                required
              />
              <p className="wallet-calculation">
                {walletCategory === 'color_log' ? '¥10' : '¥5'} × {walletQuantity || 0}컷
                {' = ¥'}
                {(
                  Math.max(0, Number(walletQuantity) || 0) *
                  (walletCategory === 'color_log' ? 10 : 5)
                ).toLocaleString('ja-JP')}
              </p>
            </>
          ) : (
            <>
              <label htmlFor="wallet-amount">금액 (엔)</label>
              <input
                id="wallet-amount"
                type="number"
                min="1"
                step="1"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                placeholder="금액 입력"
                required
              />
            </>
          )}

          <button className="submit-button" type="submit" disabled={walletLoading}>
            {walletLoading ? 'SAVING...' : '거래 내역 추가 →'}
          </button>

          {walletMessage && (
            <p className="auth-description" role="status">{walletMessage}</p>
          )}
        </form>
      </div>
    </div>
  </div>


) : page === 'quests' && isLoggedIn ? (
  <div className="auth-panel quest-panel">
    <button
      className="back-button"
      onClick={() => {
        setPage('home')
        setSelectedQuest(null)
      }}
    >
      ← BACK
    </button>

    <p className="auth-kicker">COMMAND CENTER / DAILY QUEST</p>
    <h2>일일 임무</h2>
<p className="auth-description">
  수행할 임무를 선택해 주세요.
  선택한 임무에 따라 얻을 수 있는 능력치의 종류가 달라집니다.
  능력치는 언제나 랜덤하게 1-3p를 획득합니다.
</p>
    {selectedQuest === null ? (
      <div className="quest-grid">
        {dailyQuests.map((quest) => (
          <button
            key={quest.name}
            className="quest-option"
            onClick={() => setSelectedQuest(quest)}
          >
            <span className="quest-option-icon">{quest.icon}</span>
            <span className="quest-option-stat">
              {quest.english}
            </span>
            <strong>{quest.name}</strong>
            <span className="quest-option-description">
              {quest.description}
            </span>
            <span className="quest-option-arrow">↗</span>
          </button>
        ))}
      </div>
    ) : (
      <div className="quest-confirm">
        <span className="quest-option-icon">
          {selectedQuest.icon}
        </span>
        <p className="auth-kicker">MISSION SELECTED</p>
        <h3>{selectedQuest.name}</h3>
        <p className="auth-description">
          획득 대상 능력치: {selectedQuest.stat}
        </p>

        <div className="quest-reward-preview">
          <span>REWARD</span>
          <strong>1–3 P</strong>
          <span>{selectedQuest.english}</span>
        </div>

        <p className="quest-pending">
          임무 보상 시스템 연결 준비 중
        </p>

        <button
          className="submit-button"
          onClick={() => setSelectedQuest(null)}
        >
          다른 임무 선택
        </button>
      </div>
    )}
  </div>
) : page === 'home' ? (

  <div className="entry-actions">
              <button className="entry-button primary" onClick={() => setPage('login')}>
                <span>01</span>
                LOGIN
                <b>↗</b>
              </button>
              <button className="entry-button secondary" onClick={() => setPage('signup')}>
                <span>02</span>
                SIGN UP
                <b>↗</b>
              </button>
            </div>
          ) : (

<div className="auth-panel shop-page">
  <button className="back-button" onClick={() => {
    setPage('home')
    setMessage('')
  }}>
    ← BACK
  </button>

  <p className="auth-kicker">
    MEMBER ACCESS / {page === 'login' ? '01' : '02'}
  </p>

  <h2>{page === 'login' ? 'LOGIN' : 'JOIN THE FRONTLINE'}</h2>

  <p className="auth-description">
    {page === 'login'
      ? '등록된 계정으로 로그인'
      : '이메일로 새로운 계정을 생성'}
  </p>

  <form onSubmit={handleAuth}>
    <label htmlFor="email">EMAIL</label>
    <input
      id="email"
      name="email"
      type="email"
      autoComplete="email"
      placeholder="Email address"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
    />

    <label htmlFor="password">PASSWORD</label>
    <input
      id="password"
      name="password"
      type="password"
      autoComplete={page === 'login' ? 'current-password' : 'new-password'}
      placeholder="PW"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
      minLength={6}
    />

    {page === 'signup' && (
      <>
        <label htmlFor="password-confirm">password-confirm</label>
        <input
          id="password-confirm"
          name="password-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="PW"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          minLength={6}
        />
      </>
    )}

    <button className="submit-button" type="submit" disabled={loading}>
      {loading
        ? 'PLEASE WAIT...'
        : page === 'login'
          ? 'LOGIN →'
          : 'CREATE ACCOUNT →'}
    </button>
  </form>

  {message && <p className="auth-description" role="status">{message}</p>}

  <button
    className="switch-button"
    onClick={() => {
      setPage(page === 'login' ? 'signup' : 'login')
      setMessage('')
    }}
  >
    {page === 'login'
      ? '계정을 가지고 있지 않으신 분 > SIGN UP'
      : '이미 계정이 있으신 분 > LOGIN'}
  </button>
</div>
)}


          <p className="access-note">
            <span>◆</span> AUTHORIZED MEMBERS ONLY <span>◆</span>
          </p>
        </div>

        <div className="vertical-label">SEIGI SENSEN CHILDREN</div>
      </section>

      <footer className="site-footer">
        <span>正義戦線⭐︎チルドレン</span>
        <span>EVERY GIRL HAS HER OWN JUSTICE.</span>
        <span>©SEIGI SENSEN</span>
      </footer>
    </main>
  )
}


function StatusLoadingScreen() {
  return (
    <div className="status-loading-screen">
      <img
        className="status-loading-logo"
        src="/subpage-logo.svg"
        alt="正義戦線⭐︎チルドレン"
      />

      <p className="status-loading-label">
        STATUS RECORD
      </p>

      <div
        className="status-loading-track"
        role="progressbar"
        aria-label="스테이터스 불러오는 중"
      >
        <div className="status-loading-bar" />
      </div>

      <p className="status-loading-caption">
        마법소녀의 기록을 불러오는 중...
      </p>
    </div>
  )
}


export default App
