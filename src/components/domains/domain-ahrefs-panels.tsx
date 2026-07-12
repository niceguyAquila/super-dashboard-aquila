"use client";

import { useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { formatAhrefsCents, formatNumber } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TablePagination,
  usePagination,
} from "@/components/ui/table-pagination";
import { SortableHead, useSort } from "@/components/ui/sortable-table";

export type AhrefsMetrics = {
  domain_rating: number | null;
  url_rating: number | null;
  backlinks: number | null;
  refdomains: number | null;
  organic_keywords: number | null;
  organic_keywords_top3: number | null;
  organic_traffic: number | null;
  organic_cost: number | null;
  paid_keywords: number | null;
  paid_traffic: number | null;
  paid_pages: number | null;
  paid_cost: number | null;
  fetched_at: string;
};

export type AnchorRow = {
  id: string;
  anchor: string;
  backlinks: number | null;
  refdomains: number | null;
  first_seen: string | null;
  last_seen: string | null;
};

export type BacklinkRow = {
  id: string;
  url_from: string;
  url_to: string | null;
  anchor: string | null;
  domain_rating_source: number | null;
  url_rating_source: number | null;
  is_dofollow: boolean | null;
  is_spam: boolean | null;
  link_type: string | null;
  traffic: number | null;
  first_seen: string | null;
  last_seen: string | null;
};

export type RefdomainRow = {
  id: string;
  refdomain: string;
  domain_rating: number | null;
  links_to_target: number | null;
  dofollow_links: number | null;
  traffic_domain: number | null;
  is_spam: boolean | null;
  first_seen: string | null;
  last_seen: string | null;
};

export type OrganicKeywordRow = {
  id: string;
  keyword: string;
  best_position: number | null;
  volume: number | null;
  traffic: number | null;
  keyword_difficulty: number | null;
  ranking_url: string | null;
};

export type TopPageRow = {
  id: string;
  url: string;
  traffic: number | null;
  keywords: number | null;
  top_keyword: string | null;
  top_keyword_volume: number | null;
  referring_domains: number | null;
  url_rating: number | null;
  traffic_value: number | null;
};

type AnchorSortKey = "anchor" | "backlinks" | "refdomains" | "first_seen";
type BacklinkSortKey =
  | "url_from"
  | "anchor"
  | "dr"
  | "follow"
  | "spam"
  | "type"
  | "traffic";
type RefdomainSortKey =
  | "refdomain"
  | "dr"
  | "links"
  | "dofollow"
  | "traffic"
  | "spam";
type KeywordSortKey =
  | "keyword"
  | "position"
  | "volume"
  | "traffic"
  | "difficulty";
type PageSortKey =
  | "url"
  | "traffic"
  | "keywords"
  | "top_keyword"
  | "refdomains"
  | "ur";

function dateValue(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function spamLabel(value: boolean | null | undefined) {
  if (value == null) return "—";
  return value ? "Spam" : "Clean";
}

function LinkCell({ href, label }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1 hover:underline"
    >
      <span className="truncate">{label ?? href}</span>
      <ExternalLink className="size-3 shrink-0 opacity-60" />
    </a>
  );
}

export function DomainAhrefsPanels({
  metrics,
  anchors,
  backlinks,
  refdomains,
  organicKeywords,
  topPages,
}: {
  metrics: AhrefsMetrics | null;
  anchors: AnchorRow[];
  backlinks: BacklinkRow[];
  refdomains: RefdomainRow[];
  organicKeywords: OrganicKeywordRow[];
  topPages: TopPageRow[];
}) {
  const getAnchorSortValue = useCallback(
    (row: AnchorRow, key: AnchorSortKey) => {
      switch (key) {
        case "anchor":
          return row.anchor.toLowerCase();
        case "backlinks":
          return Number(row.backlinks ?? -1);
        case "refdomains":
          return Number(row.refdomains ?? -1);
        case "first_seen":
          return dateValue(row.first_seen);
      }
    },
    [],
  );

  const getBacklinkSortValue = useCallback(
    (row: BacklinkRow, key: BacklinkSortKey) => {
      switch (key) {
        case "url_from":
          return row.url_from.toLowerCase();
        case "anchor":
          return (row.anchor ?? "").toLowerCase();
        case "dr":
          return Number(row.domain_rating_source ?? -1);
        case "follow":
          return row.is_dofollow == null ? -1 : Number(row.is_dofollow);
        case "spam":
          return row.is_spam == null ? -1 : Number(row.is_spam);
        case "type":
          return (row.link_type ?? "").toLowerCase();
        case "traffic":
          return Number(row.traffic ?? -1);
      }
    },
    [],
  );

  const getRefdomainSortValue = useCallback(
    (row: RefdomainRow, key: RefdomainSortKey) => {
      switch (key) {
        case "refdomain":
          return row.refdomain.toLowerCase();
        case "dr":
          return Number(row.domain_rating ?? -1);
        case "links":
          return Number(row.links_to_target ?? -1);
        case "dofollow":
          return Number(row.dofollow_links ?? -1);
        case "traffic":
          return Number(row.traffic_domain ?? -1);
        case "spam":
          return row.is_spam == null ? -1 : Number(row.is_spam);
      }
    },
    [],
  );

  const getKeywordSortValue = useCallback(
    (row: OrganicKeywordRow, key: KeywordSortKey) => {
      switch (key) {
        case "keyword":
          return row.keyword.toLowerCase();
        case "position":
          return Number(row.best_position ?? 9999);
        case "volume":
          return Number(row.volume ?? -1);
        case "traffic":
          return Number(row.traffic ?? -1);
        case "difficulty":
          return Number(row.keyword_difficulty ?? -1);
      }
    },
    [],
  );

  const getPageSortValue = useCallback((row: TopPageRow, key: PageSortKey) => {
    switch (key) {
      case "url":
        return row.url.toLowerCase();
      case "traffic":
        return Number(row.traffic ?? -1);
      case "keywords":
        return Number(row.keywords ?? -1);
      case "top_keyword":
        return (row.top_keyword ?? "").toLowerCase();
      case "refdomains":
        return Number(row.referring_domains ?? -1);
      case "ur":
        return Number(row.url_rating ?? -1);
    }
  }, []);

  const {
    sorted: sortedAnchors,
    sortKey: anchorSortKey,
    sortDir: anchorSortDir,
    toggleSort: toggleAnchorSortBase,
  } = useSort<AnchorRow, AnchorSortKey>(
    anchors,
    "backlinks",
    "desc",
    getAnchorSortValue,
    {
      defaultDirForKey: (key) => (key === "anchor" ? "asc" : "desc"),
    },
  );

  const {
    sorted: sortedBacklinks,
    sortKey: backlinkSortKey,
    sortDir: backlinkSortDir,
    toggleSort: toggleBacklinkSortBase,
  } = useSort<BacklinkRow, BacklinkSortKey>(
    backlinks,
    "dr",
    "desc",
    getBacklinkSortValue,
    {
      defaultDirForKey: (key) =>
        key === "url_from" || key === "anchor" || key === "type" ? "asc" : "desc",
    },
  );

  const {
    sorted: sortedRefdomains,
    sortKey: refdomainSortKey,
    sortDir: refdomainSortDir,
    toggleSort: toggleRefdomainSortBase,
  } = useSort<RefdomainRow, RefdomainSortKey>(
    refdomains,
    "dr",
    "desc",
    getRefdomainSortValue,
    {
      defaultDirForKey: (key) => (key === "refdomain" ? "asc" : "desc"),
    },
  );

  const {
    sorted: sortedKeywords,
    sortKey: keywordSortKey,
    sortDir: keywordSortDir,
    toggleSort: toggleKeywordSortBase,
  } = useSort<OrganicKeywordRow, KeywordSortKey>(
    organicKeywords,
    "traffic",
    "desc",
    getKeywordSortValue,
    {
      defaultDirForKey: (key) =>
        key === "keyword" || key === "position" ? "asc" : "desc",
    },
  );

  const {
    sorted: sortedPages,
    sortKey: pageSortKey,
    sortDir: pageSortDir,
    toggleSort: togglePageSortBase,
  } = useSort<TopPageRow, PageSortKey>(
    topPages,
    "traffic",
    "desc",
    getPageSortValue,
    {
      defaultDirForKey: (key) =>
        key === "url" || key === "top_keyword" ? "asc" : "desc",
    },
  );

  const anchorsPage = usePagination(sortedAnchors);
  const backlinksPage = usePagination(sortedBacklinks);
  const refdomainsPage = usePagination(sortedRefdomains);
  const keywordsPage = usePagination(sortedKeywords);
  const pagesPage = usePagination(sortedPages);

  function toggleAnchorSort(key: AnchorSortKey) {
    toggleAnchorSortBase(key);
    anchorsPage.setPage(1);
  }
  function toggleBacklinkSort(key: BacklinkSortKey) {
    toggleBacklinkSortBase(key);
    backlinksPage.setPage(1);
  }
  function toggleRefdomainSort(key: RefdomainSortKey) {
    toggleRefdomainSortBase(key);
    refdomainsPage.setPage(1);
  }
  function toggleKeywordSort(key: KeywordSortKey) {
    toggleKeywordSortBase(key);
    keywordsPage.setPage(1);
  }
  function togglePageSort(key: PageSortKey) {
    togglePageSortBase(key);
    pagesPage.setPage(1);
  }

  const metricCards = [
    { label: "Domain Rating", value: formatNumber(metrics?.domain_rating) },
    { label: "Backlinks", value: formatNumber(metrics?.backlinks) },
    { label: "Referring domains", value: formatNumber(metrics?.refdomains) },
    {
      label: "Organic keywords",
      value: formatNumber(metrics?.organic_keywords),
    },
    {
      label: "Keywords in top 3",
      value: formatNumber(metrics?.organic_keywords_top3),
    },
    { label: "Organic traffic", value: formatNumber(metrics?.organic_traffic) },
    {
      label: "Organic traffic value",
      value: formatAhrefsCents(metrics?.organic_cost),
    },
    { label: "Paid keywords", value: formatNumber(metrics?.paid_keywords) },
    { label: "Paid traffic", value: formatNumber(metrics?.paid_traffic) },
    { label: "Paid pages", value: formatNumber(metrics?.paid_pages) },
    {
      label: "Paid traffic cost",
      value: formatAhrefsCents(metrics?.paid_cost),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="metric-value">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referring domains</CardTitle>
          <CardDescription>
            Cached from Ahrefs — {refdomains.length} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {refdomains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No referring domains yet. Run Sync to pull Ahrefs data.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Domain"
                      sortKey="refdomain"
                      activeKey={refdomainSortKey}
                      dir={refdomainSortDir}
                      onSort={toggleRefdomainSort}
                    />
                    <SortableHead
                      label="DR"
                      sortKey="dr"
                      activeKey={refdomainSortKey}
                      dir={refdomainSortDir}
                      onSort={toggleRefdomainSort}
                    />
                    <SortableHead
                      label="Links"
                      sortKey="links"
                      activeKey={refdomainSortKey}
                      dir={refdomainSortDir}
                      onSort={toggleRefdomainSort}
                    />
                    <SortableHead
                      label="Dofollow"
                      sortKey="dofollow"
                      activeKey={refdomainSortKey}
                      dir={refdomainSortDir}
                      onSort={toggleRefdomainSort}
                    />
                    <SortableHead
                      label="Traffic"
                      sortKey="traffic"
                      activeKey={refdomainSortKey}
                      dir={refdomainSortDir}
                      onSort={toggleRefdomainSort}
                    />
                    <SortableHead
                      label="Spam"
                      sortKey="spam"
                      activeKey={refdomainSortKey}
                      dir={refdomainSortDir}
                      onSort={toggleRefdomainSort}
                    />
                    <TableHead>First seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refdomainsPage.pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {row.refdomain}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.domain_rating)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.links_to_target)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.dofollow_links)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.traffic_domain)}
                      </TableCell>
                      <TableCell>
                        {row.is_spam ? (
                          <Badge variant="destructive">Spam</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {spamLabel(row.is_spam)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.first_seen ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="refdomains-page-size"
                page={refdomainsPage.page}
                pageSize={refdomainsPage.pageSize}
                totalPages={refdomainsPage.totalPages}
                from={refdomainsPage.from}
                to={refdomainsPage.to}
                total={refdomainsPage.total}
                onPageChange={refdomainsPage.setPage}
                onPageSizeChange={refdomainsPage.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organic keywords</CardTitle>
          <CardDescription>
            Cached from Ahrefs — {organicKeywords.length} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organicKeywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organic keywords yet. Run Sync to pull Ahrefs data.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Keyword"
                      sortKey="keyword"
                      activeKey={keywordSortKey}
                      dir={keywordSortDir}
                      onSort={toggleKeywordSort}
                    />
                    <SortableHead
                      label="Pos"
                      sortKey="position"
                      activeKey={keywordSortKey}
                      dir={keywordSortDir}
                      onSort={toggleKeywordSort}
                    />
                    <SortableHead
                      label="Volume"
                      sortKey="volume"
                      activeKey={keywordSortKey}
                      dir={keywordSortDir}
                      onSort={toggleKeywordSort}
                    />
                    <SortableHead
                      label="Traffic"
                      sortKey="traffic"
                      activeKey={keywordSortKey}
                      dir={keywordSortDir}
                      onSort={toggleKeywordSort}
                    />
                    <SortableHead
                      label="KD"
                      sortKey="difficulty"
                      activeKey={keywordSortKey}
                      dir={keywordSortDir}
                      onSort={toggleKeywordSort}
                    />
                    <TableHead>URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywordsPage.pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {row.keyword}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.best_position)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.volume)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.traffic)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.keyword_difficulty)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {row.ranking_url ? (
                          <LinkCell href={row.ranking_url} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="keywords-page-size"
                page={keywordsPage.page}
                pageSize={keywordsPage.pageSize}
                totalPages={keywordsPage.totalPages}
                from={keywordsPage.from}
                to={keywordsPage.to}
                total={keywordsPage.total}
                onPageChange={keywordsPage.setPage}
                onPageSizeChange={keywordsPage.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top pages</CardTitle>
          <CardDescription>
            Cached from Ahrefs — {topPages.length} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No top pages yet. Run Sync to pull Ahrefs data.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="URL"
                      sortKey="url"
                      activeKey={pageSortKey}
                      dir={pageSortDir}
                      onSort={togglePageSort}
                    />
                    <SortableHead
                      label="Traffic"
                      sortKey="traffic"
                      activeKey={pageSortKey}
                      dir={pageSortDir}
                      onSort={togglePageSort}
                    />
                    <SortableHead
                      label="Keywords"
                      sortKey="keywords"
                      activeKey={pageSortKey}
                      dir={pageSortDir}
                      onSort={togglePageSort}
                    />
                    <SortableHead
                      label="Top keyword"
                      sortKey="top_keyword"
                      activeKey={pageSortKey}
                      dir={pageSortDir}
                      onSort={togglePageSort}
                    />
                    <SortableHead
                      label="Ref. domains"
                      sortKey="refdomains"
                      activeKey={pageSortKey}
                      dir={pageSortDir}
                      onSort={togglePageSort}
                    />
                    <SortableHead
                      label="UR"
                      sortKey="ur"
                      activeKey={pageSortKey}
                      dir={pageSortDir}
                      onSort={togglePageSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagesPage.pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[280px] truncate font-medium">
                        <LinkCell href={row.url} />
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.traffic)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.keywords)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {row.top_keyword || "—"}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.referring_domains)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.url_rating)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="pages-page-size"
                page={pagesPage.page}
                pageSize={pagesPage.pageSize}
                totalPages={pagesPage.totalPages}
                from={pagesPage.from}
                to={pagesPage.to}
                total={pagesPage.total}
                onPageChange={pagesPage.setPage}
                onPageSizeChange={pagesPage.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top anchors</CardTitle>
          <CardDescription>
            Cached from Ahrefs — {anchors.length} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anchors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No anchors yet. Run Sync to pull Ahrefs data.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Anchor"
                      sortKey="anchor"
                      activeKey={anchorSortKey}
                      dir={anchorSortDir}
                      onSort={toggleAnchorSort}
                    />
                    <SortableHead
                      label="Backlinks"
                      sortKey="backlinks"
                      activeKey={anchorSortKey}
                      dir={anchorSortDir}
                      onSort={toggleAnchorSort}
                    />
                    <SortableHead
                      label="Ref. domains"
                      sortKey="refdomains"
                      activeKey={anchorSortKey}
                      dir={anchorSortDir}
                      onSort={toggleAnchorSort}
                    />
                    <SortableHead
                      label="First seen"
                      sortKey="first_seen"
                      activeKey={anchorSortKey}
                      dir={anchorSortDir}
                      onSort={toggleAnchorSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anchorsPage.pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-md truncate font-medium">
                        {row.anchor}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.backlinks)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.refdomains)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.first_seen ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="anchors-page-size"
                page={anchorsPage.page}
                pageSize={anchorsPage.pageSize}
                totalPages={anchorsPage.totalPages}
                from={anchorsPage.from}
                to={anchorsPage.to}
                total={anchorsPage.total}
                onPageChange={anchorsPage.setPage}
                onPageSizeChange={anchorsPage.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top backlinks</CardTitle>
          <CardDescription>
            Cached from Ahrefs — {backlinks.length} total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backlinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No backlinks yet. Run Sync to pull Ahrefs data.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="From"
                      sortKey="url_from"
                      activeKey={backlinkSortKey}
                      dir={backlinkSortDir}
                      onSort={toggleBacklinkSort}
                    />
                    <SortableHead
                      label="Anchor"
                      sortKey="anchor"
                      activeKey={backlinkSortKey}
                      dir={backlinkSortDir}
                      onSort={toggleBacklinkSort}
                    />
                    <SortableHead
                      label="DR"
                      sortKey="dr"
                      activeKey={backlinkSortKey}
                      dir={backlinkSortDir}
                      onSort={toggleBacklinkSort}
                    />
                    <SortableHead
                      label="Follow"
                      sortKey="follow"
                      activeKey={backlinkSortKey}
                      dir={backlinkSortDir}
                      onSort={toggleBacklinkSort}
                    />
                    <SortableHead
                      label="Type"
                      sortKey="type"
                      activeKey={backlinkSortKey}
                      dir={backlinkSortDir}
                      onSort={toggleBacklinkSort}
                    />
                    <SortableHead
                      label="Spam"
                      sortKey="spam"
                      activeKey={backlinkSortKey}
                      dir={backlinkSortDir}
                      onSort={toggleBacklinkSort}
                    />
                    <SortableHead
                      label="Traffic"
                      sortKey="traffic"
                      activeKey={backlinkSortKey}
                      dir={backlinkSortDir}
                      onSort={toggleBacklinkSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlinksPage.pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[240px] truncate">
                        <LinkCell href={row.url_from} />
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {row.anchor || "—"}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.domain_rating_source)}
                      </TableCell>
                      <TableCell>
                        {row.is_dofollow == null
                          ? "—"
                          : row.is_dofollow
                            ? "Dofollow"
                            : "Nofollow"}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {row.link_type || "—"}
                      </TableCell>
                      <TableCell>
                        {row.is_spam ? (
                          <Badge variant="destructive">Spam</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {spamLabel(row.is_spam)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.traffic)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="backlinks-page-size"
                page={backlinksPage.page}
                pageSize={backlinksPage.pageSize}
                totalPages={backlinksPage.totalPages}
                from={backlinksPage.from}
                to={backlinksPage.to}
                total={backlinksPage.total}
                onPageChange={backlinksPage.setPage}
                onPageSizeChange={backlinksPage.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
