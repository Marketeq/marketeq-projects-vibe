 import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository }         from 'typeorm';
import { EarningsCache }      from '../entities/earnings-cache.entity';
import { ContractLabelCache } from '../entities/contract-label-cache.entity';
import { EarningsQueryDto }   from './dto/earnings-query.dto';
import { EarningsDetailDto }  from './dto/earnings-detail.dto';
import { SummaryCardDto, EarningsSummaryDto } from './dto/earnings-summary.dto';
import { CurrencyService }    from '../currency/currency.service';

@Injectable()
export class EarningsService {
  constructor(
    @InjectRepository(EarningsCache)
    private readonly earningsRepo: Repository<EarningsCache>,
    @InjectRepository(ContractLabelCache)
    private readonly labelRepo: Repository<ContractLabelCache>,
    private readonly currencySvc: CurrencyService,
  ) {}

  // ─── Endpoint 2: Earnings History ─────────────────────────────
  async getEarnings(contractorId: string, q: EarningsQueryDto, displayCurrency = 'USD') {
    const { startDate, endDate } = this.resolveDateRange(q);
    const qb = this.earningsRepo.createQueryBuilder('ec')
      .where('ec.contractorId = :cid', { cid: contractorId });

    if (q.status !== 'failed') qb.andWhere('ec.status != :rev', { rev: 'reversed' });
    if (startDate) qb.andWhere('ec.workStartAt >= :s', { s: startDate });
    if (endDate) qb.andWhere('ec.workStartAt <= :e', { e: endDate + 'T23:59:59Z' });
    if (q.projectId) qb.andWhere('ec.projectId = :pid', { pid: q.projectId });
    if (q.clientId) {
      qb.innerJoin(ContractLabelCache,'clc','clc.contractId = ec.contractId')
        .andWhere('clc.clientId = :cliid', { cliid: q.clientId });
    }
    if (q.entryType) {
      const dbType = q.entryType === 'automated' ? 'screenshot' : 'manual';
      qb.andWhere('ec.entryType = :et', { et: dbType });
    }
    if (q.status === 'failed') qb.andWhere('ec.status = :rev', { rev: 'reversed' });
    if (q.status === 'paid') qb.andWhere('ec.status = :pd', { pd: 'paid' });
    if (q.search && q.search.length >= 2) {
      const term = `%${q.search.toLowerCase()}%`;
      qb.leftJoin(ContractLabelCache,'clcs','clcs.contractId = ec.contractId')
        .andWhere('(LOWER(clcs.projectName) LIKE :t OR LOWER(clcs.clientDisplayName) LIKE :t OR LOWER(ec.taskName) LIKE :t)',{ t: term });
    } else if (q.search && q.search.length < 2) {
      throw new BadRequestException('Search term must be at least 2 characters');
    }

    const sortBy = q.sortBy || 'workStartAt';
    const sortOrder = q.sortOrder || 'desc';
    const page = q.page || 1;
    const limit = q.limit || 10;
    const view = q.view || 'daily';

    // For weekly/monthly views, aggregate rows grouped by period + contract
    if (view === 'weekly' || view === 'monthly') {
      const truncFn = view === 'weekly'
        ? `DATE_TRUNC('week', ec.work_start_at)`
        : `DATE_TRUNC('month', ec.work_start_at)`;
      const rawQb = this.earningsRepo.createQueryBuilder('ec')
        .select(truncFn, 'period')
        .addSelect('ec.contract_id', 'contractId')
        .addSelect('SUM(ec.duration_minutes)', 'totalMinutes')
        .addSelect('SUM(ec.net_amount_usd)', 'totalNet')
        .addSelect('SUM(ec.gross_amount)', 'totalGross')
        .addSelect('MIN(ec.work_start_at)', 'periodStart')
        .addSelect('MAX(ec.work_end_at)', 'periodEnd')
        .addSelect('ec.status', 'status')
        .addSelect('ec.entry_type', 'entryType')
        .where('ec.contractor_id = :cid', { cid: contractorId });
      if (q.status !== 'failed') rawQb.andWhere('ec.status != :rev', { rev: 'reversed' });
      if (startDate) rawQb.andWhere('ec.work_start_at >= :s', { s: startDate });
      if (endDate) rawQb.andWhere('ec.work_start_at <= :e', { e: endDate + 'T23:59:59Z' });
      if (q.projectId) rawQb.andWhere('ec.project_id = :pid', { pid: q.projectId });
      if (q.entryType) {
        const dbType = q.entryType === 'automated' ? 'screenshot' : 'manual';
        rawQb.andWhere('ec.entry_type = :et', { et: dbType });
      }
      if (q.status === 'failed') rawQb.andWhere('ec.status = :rev', { rev: 'reversed' });
      if (q.status === 'paid') rawQb.andWhere('ec.status = :pd', { pd: 'paid' });
      if (q.search && q.search.length >= 2) {
        const term = `%${q.search.toLowerCase()}%`;
        rawQb.leftJoin(ContractLabelCache,'clcs','clcs.contract_id = ec.contract_id')
          .andWhere('(LOWER(clcs.project_name) LIKE :t OR LOWER(clcs.client_display_name) LIKE :t OR LOWER(ec.task_name) LIKE :t)',{ t: term });
      } else if (q.search && q.search.length < 2) {
        throw new BadRequestException('Search term must be at least 2 characters');
      }
      rawQb.groupBy(truncFn).addGroupBy('ec.contract_id').addGroupBy('ec.status').addGroupBy('ec.entry_type')
        .orderBy('period', 'DESC')
        .offset((page-1)*limit).limit(limit);

      const rawRows = await rawQb.getRawMany();

      // Count distinct groups
      const countQb = this.earningsRepo.createQueryBuilder('ec')
        .select(`COUNT(DISTINCT (${truncFn}, ec.contract_id, ec.status, ec.entry_type))`, 'cnt')
        .where('ec.contractor_id = :cid', { cid: contractorId });
      if (startDate) countQb.andWhere('ec.work_start_at >= :s', { s: startDate });
      if (endDate) countQb.andWhere('ec.work_start_at <= :e', { e: endDate + 'T23:59:59Z' });
      if (q.status !== 'failed') countQb.andWhere('ec.status != :rev', { rev: 'reversed' });
      if (q.status === 'failed') countQb.andWhere('ec.status = :rev', { rev: 'reversed' });
      if (q.status === 'paid') countQb.andWhere('ec.status = :pd', { pd: 'paid' });
      if (q.projectId) countQb.andWhere('ec.project_id = :pid', { pid: q.projectId });
      if (q.entryType) {
        const dbType = q.entryType === 'automated' ? 'screenshot' : 'manual';
        countQb.andWhere('ec.entry_type = :et', { et: dbType });
      }
      if (q.search && q.search.length >= 2) {
        const term = `%${q.search.toLowerCase()}%`;
        countQb.leftJoin(ContractLabelCache,'clcs','clcs.contract_id = ec.contract_id')
          .andWhere('(LOWER(clcs.project_name) LIKE :t OR LOWER(clcs.client_display_name) LIKE :t OR LOWER(ec.task_name) LIKE :t)',{ t: term });
      }
      const countResult = await countQb.getRawOne();
      const total = parseInt(countResult?.cnt ?? '0', 10);

      const ids2 = [...new Set(rawRows.map((r:any)=>r.contractId).filter(Boolean))] as string[];
      const labels2 = ids2.length ? await this.labelRepo.findBy(ids2.map(id=>({contractId:id}))) : [];
      const lmap2 = new Map(labels2.map(l=>[l.contractId,l]));

      const data = rawRows.map((r: any) => {
        const lbl = r.contractId ? lmap2.get(r.contractId) : null;
        const mins = parseInt(r.totalMinutes ?? '0', 10);
        const net = parseFloat(r.totalNet ?? '0');
        const periodStart = new Date(r.periodStart);
        return {
          id: `${r.period}-${r.contractId}-${r.status}-${r.entryType}`,
          date: null,
          weekRange: view === 'weekly' ? this.fmtWeek(periodStart) : null,
          month: view === 'monthly' ? this.fmtMonth(periodStart) : null,
          project: lbl ? { id: lbl.projectId, name: lbl.projectName, clientHandle: '@' + lbl.clientDisplayName } : null,
          task: null,
          startTime: null, endTime: null,
          durationMinutes: mins,
          durationLabel: this.fmtMins(mins),
          grossAmount: r.totalGross,
          feeAmount: null,
          netAmount: net.toFixed(8),
          entryType: r.entryType === 'screenshot' ? 'automated' : 'manual',
          status: r.status === 'reversed' ? 'failed' : r.status,
          avgKeyboardPct: null, avgMousePct: null,
          weeklyHours: view === 'weekly' ? this.fmtMins(mins) : null,
          weeklyEarnings: view === 'weekly' ? net.toFixed(2) : null,
          budget: null,
          totalHours: view === 'monthly' ? this.fmtMins(mins) : null,
          totalEarnings: view === 'monthly' ? net.toFixed(2) : null,
          netAmountDisplay: net.toFixed(2),
          displayCurrency,
        };
      });

      return {
        view, page, limit, total,
        totalPages: Math.ceil(total / limit),
        columns: this.cols(view),
        manualTimeMinutes: 0,
        manualTimeLabel: 'This timesheet contains no manual time entries.',
        data,
        appliedFilters: { view: q.view, dateRange: q.dateRange, startDate: startDate||null,
          endDate: endDate||null, projectId: q.projectId||null, clientId: q.clientId||null,
          entryType: q.entryType||null, status: q.status||null, search: q.search||null },
      };
    }

    const col = {workStartAt:'ec.workStartAt',netAmount:'ec.netAmount',durationMinutes:'ec.durationMinutes'}[sortBy] || 'ec.workStartAt';
    qb.orderBy(col, sortOrder.toUpperCase() as 'ASC'|'DESC')
      .skip((page-1)*limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();

    const ids = [...new Set(rows.map(r=>r.contractId).filter(Boolean))] as string[];
    const labels = ids.length ? await this.labelRepo.findBy(ids.map(id=>({contractId:id}))) : [];
    const lmap = new Map(labels.map(l=>[l.contractId,l]));
    const manualMins = rows.filter(r=>r.entryType==='manual').reduce((s,r)=>s+r.durationMinutes,0);

    const data = await Promise.all(rows.map(r => this.mapRowWithCurrency(r, lmap, view, displayCurrency)));

    return {
      view, page, limit, total,
      totalPages: Math.ceil(total/limit),
      columns: this.cols(view),
      manualTimeMinutes: manualMins,
      manualTimeLabel: manualMins > 0
        ? `This timesheet includes ${this.fmtMins(manualMins)} of manual time`
        : 'This timesheet contains no manual time entries.',
      data,
      appliedFilters: { view:q.view, dateRange:q.dateRange, startDate:startDate||null,
        endDate:endDate||null, projectId:q.projectId||null, clientId:q.clientId||null,
        entryType:q.entryType||null, status:q.status||null, search:q.search||null },
    };
  }
  
  // ─── Endpoint 3: Summary Cards ────────────────────────────────
  async getSummary(contractorId: string, timezone = 'UTC', displayCurrency = 'USD'): Promise<any> {
    try { Intl.DateTimeFormat(undefined, { timeZone: timezone }); }
    catch { throw new BadRequestException('Invalid IANA timezone'); }

    const now = new Date();
    const todayStart = this.startOfDay(now, timezone);
    const weekStart = this.startOfWeek(now, timezone);
    const monthStart = this.startOfMonth(now, timezone);
    const ydayStart = new Date(todayStart); ydayStart.setDate(ydayStart.getDate()-1);
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate()-7);
    const lastWeekEnd = new Date(weekStart); lastWeekEnd.setMilliseconds(-1);
    const lastMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth()-1, 1);
    const lastMonthEnd = new Date(monthStart); lastMonthEnd.setMilliseconds(-1);

    const [todayAgg,ydayAgg,weekAgg,lastWeekAgg,monthAgg,lastMonthAgg,allAgg] = await Promise.all([
      this.agg(contractorId, todayStart, now),
      this.agg(contractorId, ydayStart, todayStart),
      this.agg(contractorId, weekStart, now),
      this.agg(contractorId, lastWeekStart, lastWeekEnd),
      this.agg(contractorId, monthStart, now),
      this.agg(contractorId, lastMonthStart, lastMonthEnd),
      this.agg(contractorId, null, null),
    ]);

    const feePercent = await this.getRecentFeePercent(contractorId);

    return {
      today:     await this.buildCard(todayAgg, ydayAgg, 'since yesterday', 'Earnings logged since 12:00 AM local time today.', this.fmtDateShort(todayStart), displayCurrency, feePercent),
      thisWeek:  await this.buildCard(weekAgg, lastWeekAgg, 'since last week', this.periodLabelRange(weekStart, now), this.fmtWeek(weekStart), displayCurrency, feePercent),
      thisMonth: await this.buildCard(monthAgg, lastMonthAgg, 'since last month', this.periodLabelRange(monthStart, now), this.fmtDateRange(monthStart, now), displayCurrency, feePercent),
      allTime:   await this.buildCard(allAgg, null, null, 'All time earnings', 'All time', displayCurrency, feePercent),
    };
  }

  // ─── Endpoint 4: Single Entry Detail ──────────────────────────
  async getDetail(contractorId: string, id: string, displayCurrency = 'USD'): Promise<any> {
    const row = await this.earningsRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Earnings entry not found');
    if (row.contractorId !== contractorId) throw new ForbiddenException('Access denied');

    const lbl = row.contractId ? await this.labelRepo.findOne({ where: { contractId: row.contractId } }) : null;

    // Fee calculations
    const grossUsd = (parseFloat(row.grossAmount) * parseFloat(row.fxRateToUsd)).toFixed(8);
    const feeUsd = (parseFloat(row.feeAmount) * parseFloat(row.fxRateToUsd)).toFixed(8);
    const grossDisp = await this.currencySvc.convertFromUsd(grossUsd, displayCurrency);
    const feeDisp = await this.currencySvc.convertFromUsd(feeUsd, displayCurrency);
    const netDisp = await this.currencySvc.convertFromUsd(row.netAmountUsd, displayCurrency);

    const grossRaw = parseFloat(row.grossAmount);
    const feeRaw = parseFloat(row.feeAmount);
    const feePercent = grossRaw > 0 ? ((feeRaw / grossRaw) * 100).toFixed(1) : '0.0';
    const feeLabel = `Marketeq Service Fee (${feePercent}%)`;
    // Display-only rounding — row.fxRateToUsd itself stays full-precision
    // (8 decimals) for the actual gross/fee/net conversions above.
    const fxRateDisplay = parseFloat(row.fxRateToUsd).toFixed(2);
    const fxPair = row.currency === 'USD'
      ? `1 USD = ${fxRateDisplay} USD (rate locked at contract creation)`
      : `1 ${row.currency} = ${fxRateDisplay} USD (rate locked at contract creation)`;

    return {
      id: row.id, transactionId: row.transactionId, contractorId: row.contractorId,
      contractId: row.contractId, projectId: row.projectId, taskId: row.taskId,
      entryType: row.entryType === 'screenshot' ? 'automated' : 'manual',
      status: row.status === 'reversed' ? 'failed' : row.status,
      grossAmount: row.grossAmount, feeAmount: row.feeAmount, netAmount: row.netAmount,
      netAmountDisplay: netDisp.amount, currency: row.currency, displayCurrency: netDisp.currency,
      fxRateToUsd: row.fxRateToUsd, netAmountUsd: row.netAmountUsd,
      workStartAt: row.workStartAt.toISOString(), workEndAt: row.workEndAt.toISOString(),
      durationMinutes: row.durationMinutes, durationLabel: this.fmtMins(row.durationMinutes),
      avgKeyboardPct: row.avgKeyboardPct, avgMousePct: row.avgMousePct,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt.toISOString(), reversedAt: row.reversedAt?.toISOString() || null,
      contract: lbl ? { id: lbl.contractId, title: lbl.contractTitle, status: lbl.status } : null,
      project: lbl ? { id: lbl.projectId, name: lbl.projectName, clientHandle: lbl.clientDisplayName ? '@' + lbl.clientDisplayName : null, clientName: lbl.clientDisplayName } : null,
      feeSection: {
        grossAmount: row.grossAmount, grossAmountDisplay: grossDisp.amount,
        feeAmount: row.feeAmount, feeAmountDisplay: feeDisp.amount,
        netAmount: row.netAmount, netAmountDisplay: netDisp.amount,
        grossAmountUsd: grossUsd, feeAmountUsd: feeUsd, netAmountUsd: row.netAmountUsd,
        billingCurrency: row.currency, displayCurrency: netDisp.currency,
        fxRateToUsd: row.fxRateToUsd, fxRateLabel: fxPair, feeLabel, feePercent,
        lineItems: [
          { label: 'Gross Earnings', amount: grossDisp.amount, currency: netDisp.currency, amountRaw: row.grossAmount, currencyRaw: row.currency },
          { label: feeLabel, amount: `-${feeDisp.amount}`, currency: netDisp.currency, amountRaw: `-${row.feeAmount}`, currencyRaw: row.currency },
          { label: 'You Receive', amount: netDisp.amount, currency: netDisp.currency, amountRaw: row.netAmount, currencyRaw: row.currency, isTotal: true },
        ],
      },
    };
  }

  // ─── Endpoint: Create Earning ───────────────────────────────
  async createEarning(dto: any) {
    // Basic duplicate check by idempotencyKey
    const exists = await this.earningsRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
    if (exists) return exists;
    const earning = this.earningsRepo.create(dto);
    return this.earningsRepo.save(earning);
  }

  // ─── YTD for internal endpoint ────────────────────────────────
  async getYtd(userId: string, year: number) {
    const currentYear = new Date().getUTCFullYear();
    if (!Number.isInteger(year) || year < 2000 || year > currentYear + 1)
      throw new BadRequestException('year must be an integer between 2000 and current year + 1');
    const from = new Date(`${year}-01-01T00:00:00Z`);
    const to = new Date(`${year}-12-31T23:59:59.999Z`);
    const row = await this.earningsRepo.createQueryBuilder('ec')
      .select('COALESCE(SUM(CAST(ec.netAmountUsd AS numeric)), 0)', 'ytd')
      .addSelect('MAX(ec.createdAt)', 'lastEarning')
      .where('ec.contractorId = :uid', { uid: userId })
      .andWhere('ec.status != :rev', { rev: 'reversed' })
      .andWhere('ec.workStartAt >= :from', { from })
      .andWhere('ec.workStartAt <= :to', { to })
      .getRawOne();
    const ytd = parseFloat(row?.ytd ?? '0');
    return {
      userId, year, ytdTotalUsd: ytd.toFixed(2), thresholdUsd: 600.00,
      thresholdReached: ytd >= 600.00,
      lastEarningAt: row?.lastEarning ? new Date(row.lastEarning).toISOString() : null,
    };
  }

  // ─── Private: Row mapping with currency + fee ─────────────────
  private async mapRowWithCurrency(row: EarningsCache, lmap: Map<string,ContractLabelCache>, view: string, displayCurrency: string) {
    const base = this.mapRow(row, lmap, view);
    const grossUsd = (parseFloat(row.grossAmount) * parseFloat(row.fxRateToUsd)).toFixed(8);
    const feeUsd = (parseFloat(row.feeAmount) * parseFloat(row.fxRateToUsd)).toFixed(8);

    const grossDisp = await this.currencySvc.convertFromUsd(grossUsd, displayCurrency);
    const feeDisp = await this.currencySvc.convertFromUsd(feeUsd, displayCurrency);
    const netDisp = await this.currencySvc.convertFromUsd(row.netAmountUsd, displayCurrency);

    const grossRaw = parseFloat(row.grossAmount);
    const feeRaw = parseFloat(row.feeAmount);
    const feePercent = grossRaw > 0 ? ((feeRaw / grossRaw) * 100).toFixed(1) : '0.0';

    // Legacy entry check
    const isLegacy = grossRaw === 0 && feeRaw === 0 && parseFloat(row.netAmount) > 0;

    return {
      ...base,
      netAmountDisplay: netDisp.amount,
      displayCurrency: netDisp.currency,
      ...(isLegacy ? { legacyEntry: true } : {
        feeBreakdown: {
          grossAmountDisplay: grossDisp.amount, grossAmountRaw: row.grossAmount,
          feeAmountDisplay: feeDisp.amount, feeAmountRaw: row.feeAmount,
          feeLabel: `Marketeq Service Fee (${feePercent}%)`, feePercent,
          netAmountRaw: row.netAmount, currency: row.currency, displayCurrency: netDisp.currency,
        },
      }),
    };
  }

  // ─── Private: Recent fee percent for summary cards ────────────
  private async getRecentFeePercent(contractorId: string): Promise<string> {
    const feeRow = await this.earningsRepo.createQueryBuilder('ec')
      .select('ec.grossAmount', 'gross').addSelect('ec.feeAmount', 'fee')
      .where('ec.contractorId = :id', { id: contractorId })
      .andWhere('ec.status != :rev', { rev: 'reversed' })
      .orderBy('ec.workStartAt', 'DESC').limit(1).getRawOne();
    return feeRow && parseFloat(feeRow.gross) > 0
      ? ((parseFloat(feeRow.fee) / parseFloat(feeRow.gross)) * 100).toFixed(1) : '20.0';
  }

  // ─── Private helpers (unchanged from before) ──────────────────
  private resolveDateRange(q: EarningsQueryDto): {startDate:string|null;endDate:string|null} {
    const today = new Date(); const fmt = (d:Date) => d.toISOString().split('T')[0];
    if (q.dateRange === 'custom') {
      if (!q.startDate || !q.endDate) throw new BadRequestException('startDate and endDate required for custom range');
      if (new Date(q.startDate) > new Date(q.endDate)) throw new BadRequestException('startDate must not be after endDate');
      if (new Date(q.startDate) > today) throw new BadRequestException('startDate cannot be in the future');
      if ((new Date(q.endDate).getTime()-new Date(q.startDate).getTime()) > 3*365*24*60*60*1000)
        throw new BadRequestException('Date range cannot exceed 3 years');
      return { startDate: q.startDate, endDate: q.endDate };
    }
    const presets: Record<string,()=>{startDate:string|null;endDate:string|null}> = {
      today:()=>({startDate:fmt(today),endDate:fmt(today)}),
      yesterday:()=>{const d=new Date(today);d.setDate(d.getDate()-1);return{startDate:fmt(d),endDate:fmt(d)};},
      this_week:()=>{const d=new Date(today);const m=new Date(d);m.setDate(d.getDate()-((d.getDay()+6)%7));const s=new Date(m);s.setDate(m.getDate()+6);return{startDate:fmt(m),endDate:fmt(s)};},
      last_week:()=>{const d=new Date(today);const m=new Date(d);m.setDate(d.getDate()-((d.getDay()+6)%7)-7);const s=new Date(m);s.setDate(m.getDate()+6);return{startDate:fmt(m),endDate:fmt(s)};},
      this_month:()=>({startDate:fmt(new Date(today.getFullYear(),today.getMonth(),1)),endDate:fmt(today)}),
      last_month:()=>({startDate:fmt(new Date(today.getFullYear(),today.getMonth()-1,1)),endDate:fmt(new Date(today.getFullYear(),today.getMonth(),0))}),
      this_year:()=>({startDate:fmt(new Date(today.getFullYear(),0,1)),endDate:fmt(today)}),
      last_year:()=>({startDate:fmt(new Date(today.getFullYear()-1,0,1)),endDate:fmt(new Date(today.getFullYear()-1,11,31))}),
      all_time:()=>({startDate:null as string|null,endDate:null as string|null}),
    };
    return presets[q.dateRange || 'all_time']?.() ?? {startDate:null,endDate:null};
  }

  private async agg(contractorId:string,from:Date|null,to:Date|null) {
    const qb = this.earningsRepo.createQueryBuilder('ec')
      .select('COALESCE(SUM(ec.netAmountUsd),0)','totalUsd')
      .addSelect('COALESCE(SUM(ec.durationMinutes),0)','durationMinutes')
      .where('ec.contractorId = :cid',{cid:contractorId})
      .andWhere('ec.status != :rev',{rev:'reversed'});
    if (from) qb.andWhere('ec.workStartAt >= :from',{from});
    if (to) qb.andWhere('ec.workStartAt < :to',{to});
    const r = await qb.getRawOne();
    return {totalUsd:r.totalUsd,durationMinutes:parseInt(r.durationMinutes,10)};
  }

  private async buildCard(curr:any,prev:any,sinceLabel:string|null,periodLabel:string,dateRangeLabel:string,displayCurrency:string,feePercent:string) {
    const amount = parseFloat(curr.totalUsd);
    const converted = await this.currencySvc.convertFromUsd(curr.totalUsd, displayCurrency);
    let changePercent:number|null=null; let changeDirection:'up'|'down'|'unchanged'='unchanged'; let changeLabel:string|null=null;
    if (prev !== null) {
      const prevAmount = parseFloat(prev.totalUsd);
      if (prevAmount > 0) {
        changePercent = Math.round(((amount-prevAmount)/prevAmount)*1000)/10;
        changeDirection = changePercent>0?'up':changePercent<0?'down':'unchanged';
        changeLabel = `${Math.abs(changePercent)}% ${sinceLabel}`;
      }
    }
    return {
      amount: converted.amount, displayCurrency: converted.currency,
      hoursLogged: curr.durationMinutes, hoursLabel: this.fmtMins(curr.durationMinutes),
      changePercent, changeLabel, changeDirection, periodLabel, dateRangeLabel,
      feeNoteLabel: `After ${feePercent}% service fee`,
    };
  }

  private cols(view:string):string[] {
    return {daily:['date','project','task','startTime','endTime','duration','earnings'],
            weekly:['weekRange','project','weeklyHours','weeklyEarnings','budget'],
            monthly:['month','project','totalHours','totalEarnings']}[view]
        || ['date','project','task','startTime','endTime','duration','earnings'];
  }

  private mapRow(row:EarningsCache,lmap:Map<string,ContractLabelCache>,view:string):object {
    const lbl = row.contractId ? lmap.get(row.contractId) : null;
    return {
      id:row.id, date:view==='daily'?this.fmtDate(row.workStartAt):null,
      weekRange:view==='weekly'?this.fmtWeek(row.workStartAt):null,
      month:view==='monthly'?this.fmtMonth(row.workStartAt):null,
      project:lbl?{id:row.projectId,name:lbl.projectName,clientHandle:'@'+lbl.clientDisplayName}:null,
      task:view==='daily'?{id:row.taskId,name:(row as any).taskName||null}:null,
      startTime:view==='daily'?this.fmtTime(row.workStartAt):null,
      endTime:view==='daily'?this.fmtTime(row.workEndAt):null,
      durationMinutes:row.durationMinutes, durationLabel:this.fmtMins(row.durationMinutes),
      grossAmount:row.grossAmount, feeAmount:row.feeAmount, netAmount:row.netAmount,
      entryType:row.entryType==='screenshot'?'automated':'manual',
      status:row.status==='reversed'?'failed':row.status,
      avgKeyboardPct:view==='daily'?row.avgKeyboardPct:null,
      avgMousePct:view==='daily'?row.avgMousePct:null,
      weeklyHours:view==='weekly'?this.fmtMins(row.durationMinutes):null,
      weeklyEarnings:view==='weekly'?row.netAmountUsd:null,
      budget:null,
      totalHours:view==='monthly'?this.fmtMins(row.durationMinutes):null,
      totalEarnings:view==='monthly'?row.netAmountUsd:null,
    };
  }

  private startOfDay(d:Date,tz:string):Date{return new Date(d.toLocaleDateString('en-US',{timeZone:tz}));}
  private startOfWeek(d:Date,tz:string):Date{const s=this.startOfDay(d,tz);s.setDate(s.getDate()-((s.getDay()+6)%7));return s;}
  private startOfMonth(d:Date,tz:string):Date{const s=this.startOfDay(d,tz);s.setDate(1);return s;}
  private fmtDate(d:Date):string{return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
  private fmtTime(d:Date):string{return d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'America/Chicago'});}
  private fmtMonth(d:Date):string{return d.toLocaleDateString('en-US',{month:'long',year:'numeric'});}
  private fmtMins(m:number):string{return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`;}
  private fmtWeek(d:Date):string{const m=new Date(d);m.setDate(d.getDate()-((d.getDay()+6)%7));const s=new Date(m);s.setDate(m.getDate()+6);const f=(x:Date)=>x.toLocaleDateString('en-US',{month:'short',day:'numeric'});return `${f(m)} – ${f(s)}, ${s.getFullYear()}`;}
  private fmtDateShort(d:Date):string{return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
  private fmtDateRange(from:Date,to:Date):string{return `${this.fmtDateShort(from)} – ${this.fmtDateShort(to)}`;}
  private periodLabelRange(start:Date,now:Date):string{const f=(d:Date)=>d.toLocaleDateString('en-US',{month:'long',day:'numeric'});return `${f(start)} - ${f(now)}, ${now.getFullYear()}`;}
}
